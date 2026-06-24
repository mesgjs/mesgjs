# Call-Stack Redesign

## Background

Sending an attributed message currently results in a call stack like the following:

```
> ms1.d.sm($c, 'throw', ['stack snapshot'])
Uncaught Error: stack snapshot
    at Object.opThrow [as code] (file:///.../mesgjs/src/runtime/msjs-core.esm.js:125:40)
    at dispatchHandler (file:///.../mesgjs/src/runtime/runtime.esm.js:358:27)
    at dispatchMessage (file:///.../mesgjs/src/runtime/runtime.esm.js:401:10)
    at msjsR$Object (file:///.../mesgjs/src/runtime/runtime.esm.js:544:82)
    at Object.msjsS$SendMessage (file:///.../mesgjs/src/runtime/runtime.esm.js:934:18)
    at <anonymous>:1:28
```

That is:

1. The "send message" function (`d.sm`), which is how native Mesgjs objects generally communicate between themselves
2. The target object's receiver function
3. The message dispatcher
4. The handler dispatcher
5. The message handler

## Proposal

The goal: trampoline most of the call stack down to two active stack frames per handler.

### Anonymous Call (E.g. From JavaScript)

1. The receiver calls the object's dispatcher via `this.getDisp(op, mp)` — `this` is `rrThis` (the receiver's bound context), `op` is the message operation, and `mp` is the message params.
   - `this` includes the `rr` (receiver function), and `rt` (receiver type)
2. The dispatcher returns the dispatch object (`d`), message handler, and optional trace handler.
3. The receiver calls the message handler (returning its return value), passing `d`, in a try/catch/finally block.
4. The receiver invokes a standard catch handler and returns its return value on exception.

Stack activity: receiver + dispatcher - dispatcher + handler (2 (receiver + handler) currently active) - handler - receiver

### Attributed Call

1. The sender (`d.sm`) clears `mesgBaton`, then calls the receiver with **no parameters**.
2. The receiver detects the no-parameter call (`op === undefined`), sets `mesgBaton = this` (i.e. `rrThis`), and returns.
3. The *sender* reads `rrThis` from `mesgBaton`, then calls `rrThis.getDisp(op, mp, srThis)` — where `srThis` is the sender's own `this` (its `rrThis`).
   - The sender's `this` includes `rr` (receiver function) and `rt` (receiver type), which serve as the `sr` (sender) and `st` (sender type) from the perspective of the message dispatch.
4. Continuing as above, the dispatcher returns the dispatch object, message handler, and optional trace handler.
5. The *sender* calls the message handler (returning its return value), passing `d`, in a try/catch/finally block.
6. The *sender* invokes a standard catch handler and returns its return value on exception.

Stack activity: sender + receiver - receiver + dispatcher - dispatcher + handler (2 (sender + handler) currently active) - handler - sender

### Redispatch

From the sender's perspective, `@d(redis ...)` is just a normal attributed message to `d` — the sender does not know or care that a redispatch is happening.

1. `@d(redis ...)` in Mesgjs is just an attributed `d.sm(d, 'redis', mp)` in JS. The sender (the originally-messaged object) clears `mesgBaton` and calls `d` with no parameters.
2. The dispatch object sets `mesgBaton = this` (its `rrThis`) and returns.
3. The sender reads `rrThis` from `mesgBaton`, then calls `rrThis.getDisp('redis', mp, srThis)` — which happens to be `getDispatchDispatch`, though the sender does not know this.
4. `getDispatchDispatch`, handling the `redis` op, delegates to the original object's dispatcher: it performs a baton handshake on the original object's receiver (obtained via `rrThis.octx.mctx.rr`), reads `objRrThis` from `mesgBaton`, then calls `objRrThis.getDisp(rdop, rdmp, rrThis)` — passing `rrThis` (the `@dispatch` object's own `bfnThis`) as `srThis`.
5. `getDispatch` (the original object's dispatcher), seeing `srThis.rt === '@dispatch'`, knows this is a redispatch. It reads `srThis.octx` for the prior handler context (`handler`, `isInit`, `mctx`) and performs the chain-aware handler selection. The resulting `{ d, handler, trace? }` bundle is returned back through `getDispatchDispatch` to the sender as if `getDispatchDispatch` had determined it directly.
6. The sender calls the message handler (returning its return value), passing `d`, in a try/catch/finally block.
7. The sender invokes a standard catch handler and returns its return value on exception.

Stack activity: sender + receiver - receiver + @d dispatcher + obj dispatcher - obj dispatcher - @d dispatcher + handler (2 (sender + handler) currently active) - handler - sender

## Dispatcher Return Value

The dispatcher (and the `@d` dispatcher for redispatch) returns a plain object:

```js
{
  d,       // The @dispatch object for this handler invocation
  handler, // { code, type, op } — the message handler (execute via handler.code(d))
  trace,   // traceDispatch(d, phase, value?) or undefined when tracing disabled
}
```

**No per-dispatch allocations in the bundle.**

- `trace` is the shared function `traceDispatch` if tracing is enabled, or `undefined` if disabled.
- `traceDispatch(d, phase, value?)` — a single function handling four tracing phases via `phase`:
  - `0` — before handler: logs dispatch, pushes `{ disp: d, ...flc }` onto stack
  - `1` — after handler returns: logs return value (`value = result`)
  - `2` — on exception: logs exception, appends Mesgjs stack trace (`value = e`)
  - `3` — finally: pops the Mesgjs stack entry

`d.dispNo` (assigned at dispatch creation time when tracing is enabled) provides log correlation across phases. When tracing is disabled, `trace` is `undefined` in the bundle.

The `@loop` and `@try` interfaces catch their own `MsjsFlow` exceptions (`next`, `stop`) inside their handler code. The only `MsjsFlow` that reaches the dispatch call site is `MsjsFlow('return')` from `@d(return ...)`.

The uniform call-site pattern (used by sender, receiver, and redispatch alike):

```js
try {
  trace?.(d, 0);
  const result = handler.code(d);
  trace?.(d, 1, result);
  return result;
} catch (e) {
  trace?.(d, 2, e);
  if (d.capture && e instanceof MsjsFlow) return d.result;
  throw e;
} finally {
  trace?.(d, 3);
}
```

When tracing is disabled (`trace` is `undefined`), all four `?.()` calls short-circuit with no function-call overhead.

The only allocation per dispatch is the `@dispatch` object `d` itself.

## Non-Tracing Performance Impact

**Attributed message send** (the common case):

| | Current | New |
|---|---|---|
| Function calls before handler | 4 | 3 |
| Active stack frames during handler | 5 | 2 |
| `mesgBaton` global write+read | Yes | Attributed path only |
| Allocations per dispatch | 1 (`@dispatch` d) | 1 (`@dispatch` d) |

Net: 25% fewer function calls, 60% fewer active stack frames, same allocation count. The stack frame reduction is the primary benefit — it reduces JS engine stack pressure and improves stack trace clarity for deep Mesgjs call chains.

**`@code(run)` hot path** (called for every code block execution):

Current: `rr('run')` → `msjsR$Code` → `this.cd(this.od)` — 2 frames, zero allocations (no dispatch object, no closure).

New path: `rr('run')` → `msjsR$RecvMsg` → `getCodeDispatch` returns `{ d: rrThis.od, handler: rrThis.handler, trace }` — 2 frames. Since `d` and `handler` are both fixed at bind time, `getCodeDispatch` can return a **pre-built, cached bundle** stored in `bfnThis` at creation time. The `(run)` path is then allocation-free: `getCodeDispatch` returns `rrThis.runBundle` directly (after updating its `trace` property) with no other object construction.

## Implementation Plan

### Step 1 — Repurpose `mesgBaton` as the Attributed-Call Handshake

`mesgBaton` is retained but its role changes. Instead of carrying the full
attributed-call context *into* the receiver, it is now used as a two-way
handshake channel between `msjsS$SendMsg` and `msjsR$RecvMsg`:

- The sender clears `mesgBaton` and calls `rr()` with no parameters.
- The receiver, seeing `op === undefined`, sets `mesgBaton = this` (its `rrThis`)
  and returns immediately.
- The sender reads `rrThis` from `mesgBaton` and proceeds with dispatch.

### Step 2 — Define Receiver and Sender `this` Shapes

**Receiver `this`** (the object bound to `msjsR$RecvMsg`):
```js
{ rr, rt, octx, getDisp }
// rr      — the receiver function itself (the Mesgjs object)
// rt      — the receiver's Mesgjs type string
// octx    — the object context (persistent JS state)
// getDisp — dispatch builder: getDispatch for regular objects,
//           type-specific builder for @code, @function, @dispatch, @interface
```

**Sender `this`** (the object bound to `msjsS$SendMsg`):

`msjsS$SendMsg` is bound to the sender's `rrThis` (i.e. `{ rr, rt, octx, getDisp }`),
so `this.rr` and `this.rt` serve as the sender identity (`sr`/`st`) from the
perspective of the dispatch. There is no separate `{ sr, st }` object — `sr` and
`st` are conceptual roles reported by `@d`, not a distinct binding shape.

Receivers and senders are created as bound template functions so that `this`
is always available without closure capture.

### Step 3 — Refactor `dispatchHandler` + `dispatchMessage` into `getDispatch`

Merge `dispatchHandler` and `dispatchMessage` into a single function:

```js
function getDispatch(op, mp, srThis) {
  // this = rrThis (receiver this): { rr, rt, octx, getDisp }
  // srThis (sender's rrThis, optional): { rr, rt, octx, getDisp }
  //   — if srThis.rt === '@dispatch', this is a redispatch; srThis.octx
  //     holds the prior handler context (handler, isInit, mctx)
  ...
  return { d, handler, trace? };
}
```

Rather than a `switch`/`case` inside `getDispatch`, each `bfnThis` stores a
`getDisp` reference directly:

```js
// Regular objects:
bfnThis.getDisp = getDispatch;         // standard path
// Special objects:
bfnThis.getDisp = getCodeDispatch;     // @code
bfnThis.getDisp = getFunctionDispatch; // @function
bfnThis.getDisp = getDispatchDispatch; // @dispatch
bfnThis.getDisp = getInterfaceDispatch; // @interface
```

The call site (receiver and sender) becomes:

```js
const { d, handler, trace } = rrThis.getDisp(op, mp, srThis);
```

This eliminates the `switch`/`case` entirely and avoids any `||` fallback
overhead — every call is a direct property lookup + call. For the `@code(run)`
hot path, `getCodeDispatch` is called directly with no intermediate dispatch.

The standard `getDispatch(op, mp, srThis)` (called as `rrThis.getDisp(op, mp, srThis)`, so `this = rrThis`):
1. Calls `canMesgProps` (now baton-free) to normalize `op` and `mp`
2. Checks `srThis.rt`: if `'@dispatch'`, this is a redispatch — reads `srThis.octx`
   for the prior handler context (`handler`, `isInit`, `mctx`) and performs
   chain-aware handler selection (including `flatChain` check, `@next` handling,
   `getHandler` with `next` flag, and the "don't switch to default if not changing
   op" guard). Otherwise, looks up the handler via `getHandler` for a fresh dispatch.
   In both cases, handles `hasElse`/`elseExpr` if no handler is found.
3. Constructs the `@dispatch` object `d` (as `dispatchHandler` currently does),
   assigning `d.dispNo` if tracing is enabled. Populates `d`'s `octx` with
   `handler`, `isInit`, and `mctx` (the canonical message context) so that a
   subsequent `@d(redis)` can access the prior dispatch state via `srThis.octx`.
4. Builds the `sm` send-message function bound to `rrThis` (not a new `{ sr, st }`
   object — `rrThis` already contains `rr` and `rt`, which serve as the sender
   identity for any messages sent from within the handler)
5. Returns `trace = traceDispatch` if tracing is enabled, `undefined` otherwise

`getDispatch` (and all custom dispatch builders) do *not* call `handler.code(d)`.

### Step 4 — Unify All Receivers as `msjsR$RecvMsg`

All Mesgjs objects — regular objects, `@code`, `@function`, `@dispatch`,
`@interface` — use the same receiver template function. Special behavior is
handled by each object's `bfnThis.getDisp` reference, not by separate receiver
functions or a `switch`/`case` inside `getDispatch`.

The single receiver template:

```js
function msjsR$RecvMsg (op, mp) {
  if (op === undefined) {  // Attributed-call handshake
    mesgBaton = this;
    return;
  }
  const { d, handler, trace } = this.getDisp(op, mp);
  try {
    trace?.(d, 0);
    const result = handler.code(d);
    trace?.(d, 1, result);
    return result;
  } catch (e) {
    trace?.(d, 2, e);
    if (d.capture && e instanceof MsjsFlow) return d.result;
    throw e;
  } finally {
    trace?.(d, 3);
  }
}
```

Bound at object-creation time (in two steps, as `rr` needs to reference itself):

```js
const bfnThis = { rr: null, rt: type, octx, getDisp: getDispatch };
const rr = bfnThis.rr = msjsR$RecvMsg.bind(bfnThis);
```

Special objects set `bfnThis.getDisp` to their type-specific dispatch builder
instead of `getDispatch`. Both `newMsjsCode` and `newMsjsFunction` store a full
`handler: { code, type, op }` shape in `bfnThis` — `@code` uses
`{ code: cd, type: '@code', op: 'run' }` and `@function` uses
`{ code: cd, type: '@function', op: 'call' }`. The `@code(fn)` op retrieves the
code function from `rrThis.handler.code` to pass to `newMsjsFunction`.

### Step 5 — Update `msjsS$SendMessage` (Attributed Call Path)

Replace the old baton-as-input mechanism with the new baton-as-handshake pattern:

```js
function msjsS$SendMsg (rr, op, mp) {
  if (typeof rr !== 'function' || !rr?.msjsType) rr = gt.$toMsjs(rr);
  mesgBaton = undefined;
  rr();                          // receiver sets mesgBaton = its rrThis
  const rrThis = mesgBaton;      // { rr, rt, octx, getDisp }
  const { d, handler, trace } = rrThis.getDisp(op, mp, this);  // this inside getDisp = rrThis; this here = srThis AKA sender's rrThis
  try {
    trace?.(d, 0);
    const result = handler.code(d);
    trace?.(d, 1, result);
    return result;
  } catch (e) {
    trace?.(d, 2, e);
    return catchHandler(d, e);
  } finally {
    trace?.(d, 3);
  }
}
```

A valid Mesgjs receiver will always populate `mesgBaton` when called with no
parameters. If `rrThis` is `undefined` after `rr()`, the receiver is not a
valid Mesgjs object (e.g. a raw JS function that was not properly wrapped).

### Step 6 — Custom Dispatch Builders for `@code`, `@function`, `@dispatch`, and `@interface`

With the unified receiver (Step 4), the separate `msjsR$Code`, `msjsR$Function`,
and `msjsR$Dispatch` template functions are eliminated. These types do not use
normal interface-based handler lookup — their entire dispatch logic is custom.
Each stores a type-specific `getDisp` function in `bfnThis` that *replaces* the
standard `getDispatch` procedure entirely.

**`@code` — `getCodeDispatch(op, mp, srThis)`** (called as `rrThis.getDisp(op, mp, srThis)`, so `this = rrThis`):

The current `msjsR$Code` handles: `run` (fast-track), `@init`/`initSym` (no-op),
`getCode` (codeBaton extraction), `fn` (new function), `hasElse` fallback, and
throws for unknown ops. `getCodeDispatch` replicates this logic and returns the
appropriate `{ d, handler, trace? }` bundle.

For `(run)`: returns `d = rrThis.od` (the *original* dispatch context stored when
the code was bound via `bindCode`) and `handler = rrThis.handler` (the
`{ code, type: '@code', op: 'run' }` shape). This is critical — `(run)` must
execute the code in its original dispatch context, not a new one. When tracing
is disabled, `getCodeDispatch` returns a **pre-built, cached bundle** from
`bfnThis.runBundle` — zero allocation on the hot path.

**`@function` — `getFunctionDispatch(op, mp, srThis)`** (called as `rrThis.getDisp(op, mp, srThis)`, so `this = rrThis`):

The current `msjsR$Function` handles: `call` (fast-track via `dispatchHandler`),
`fn` (new function), `jsfn` (JS wrapper), `hasElse` fallback, and throws for
unknown ops. `getFunctionDispatch` replicates this, constructing a proper dispatch
bundle for `(call)` using the function's `octx` and `rrThis.handler`.

**`@dispatch` — `getDispatchDispatch(op, mp, srThis)`** (called as `rrThis.getDisp(op, mp, srThis)`, so `this = rrThis`):

The current `msjsR$Dispatch` handles: `dop`, `ht`, `js`, `log`, `mop`, `redis`,
`return`, `rr`, `rt`, `sr`, `st`, `smi`, `undefined` (error), and `hasElse`
fallback. `getDispatchDispatch` replicates this entire logic.

To keep all `bfnThis` objects at the same shape `{ rr, rt, octx, getDisp }` —
ensuring a monomorphic IC for `rrThis.getDisp` across all object types — the
dispatch state needed for `redis` is stored in `octx` rather than directly
in `bfnThis`. `getDispatch` populates `d`'s `octx` with these fields at
dispatch-object creation time:

```js
// @dispatch octx (rrThis.octx for getDispatchDispatch):
{
  handler,  // current handler { code, type, op } — needed for flatChain check,
            //   default rdType, and default rdop
  isInit,   // passed to getHandler for redispatch
  mctx,     // original message context — needed for getRDMP (original mp)
  // (plus the object's octx fields: js, ps, etc.)
}
```

`octx` is the dispatch object's own per-object context — storing dispatch state
there is natural, just as a native Mesgjs object stores its persistent state in
`d.p` (i.e. `octx.ps`).

For `redis`, `getDispatchDispatch` delegates to the original object's dispatcher
rather than duplicating the chain-aware handler selection logic. It performs a
baton handshake on the original object's receiver (obtained via `rrThis.octx.mctx.rr`),
reads `objRrThis` from `mesgBaton`, then calls:

```js
objRrThis.getDisp(rdop, rdmp, rrThis)
```

passing `rrThis` (the `@dispatch` object's own `bfnThis`) as `srThis`. The
standard `getDispatch` function, seeing `srThis.rt === '@dispatch'`, knows this
is a redispatch and reads `srThis.octx` for the prior handler context. The
resulting `{ d, handler, trace? }` bundle is returned back through
`getDispatchDispatch` to the original sender — keeping the stack at 2 active
frames and avoiding any duplication of the chain-walk logic.

**`@interface` — `getInterfaceDispatch(op, mp, srThis)`** (called as `rrThis.getDisp(op, mp, srThis)`, so `this = rrThis`):

The current `msjsR$Interface` handles: `instance`, `name`, `set`, `hasElse`
fallback, and throws for unknown ops. The custom builder replicates this logic.
`@interface` objects are not regular Mesgjs instances (they are created by
`getInterface`, not `getInstance`), so their `bfnThis` shape may differ slightly
from the standard receiver `this` — the builder must account for this.

### Step 7 — Update `moduleScope`

`moduleScope` creates a custom `msjsR$Module` and `msjsR$Dispatch` pair.
The module receiver is only called from transpiled module-load code (not via
attributed messaging), so it does not need to handle the baton handshake. The
module dispatch object does not support `redis` or `return`, so it can throw
if ever called with no parameters.

### Step 8 — Update `senderFLC()`

`senderFLC` currently discards stack frames through `msjsR$` and `msjsS$`
prefixes to find the caller's source location. With the new design, the
intermediate `dispatchMessage` and `dispatchHandler` frames are gone, so the
frame immediately after `msjsS$SendMsg` (for attributed calls) or after
`msjsR$RecvMsg` (for anonymous calls) is the actual caller. Verify and update
the frame-discarding logic accordingly.

### Step 9 — Remove `canMesgProps` Baton Logic; Update `getInstance`

`mesgBaton` is retained (repurposed as the handshake channel), but the old
`checkBaton` path in `canMesgProps` is no longer needed — remove it.
`canMesgProps` becomes a pure normalization function (no baton check, no side
effects). The `checkBaton` parameter and its associated logic are removed.

Also remove the `mesgBaton` setup/teardown in `getInstance` (used for `@init`
dispatch) — replace with a direct call via `bfnThis.getDisp(initSym)` (or
equivalently `getDispatch.call(bfnThis, initSym)`), using the receiver's
`bfnThis` as `this`.

### Step 10 — Testing

The existing test suite in `test/` should continue to pass. Key areas to verify:

- Attributed message dispatch (basic send/receive)
- `@d(return ...)` early return via `MsjsFlow` capture
- `@d(redis ...)` redispatch (same op, different op, `@next`, specific type)
- Exception propagation through the new catch path
- Debug/trace output (`debugConfig` with `dispatch`, `stack`, `dispatchSource`,
  `stackSource`, `dispatchTypes`, `stackTypes`)
- `senderFLC()` source location accuracy
- `@code(run)` and `@function(call)` fast-track paths
- Module scope (`moduleScope`) load dispatch
- `getInstance` `@init` dispatch
