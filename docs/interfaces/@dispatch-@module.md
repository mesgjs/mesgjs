# Mesgjs `@dispatch` Interface

Every code block (standard in-line block, function-mode code block, or message-handler block) is passed a `@dispatch` object instance, "`d`", as its only function parameter.

This interface is "bilingual", supporting both JavaScript object properties and Mesgjs messages.

## Mesgjs Message Operations

* `(dop)` \- the current dispatch's requested operation   
* `(hop)` \- the currently-dispatched handler operation
* `(ht)` \- the currently-dispatched handler's interface type  
* `(js)` \- returns the JS-level state object of the receiver, if set (getter/setter access to receiver's JS state)
* `(log)` \- logs the dispatch object to the JS console  
* `(mop)` \- returns the original message's requested operation   
* `(orr)` \- the original receiver (before any singleton receiver conversion); for boxed JavaScript values (numbers, strings, arrays, etc.), this is the original JavaScript value
* `(redis type=superType? op=op? params=mesgParams? else=default?)` \- redispatch to another handler, optionally specifying a "super-type", new message operation, or new message parameters. The optional `else` (RIC) value is returned instead of `@u` (undefined) if there are no other handlers to dispatch.  
  * If the requested operation is (either implicitly or explicitly) the same as the current operation, the redispatch will automatically happen from the current type's next "super-type" in the interface chain.
  * If you want to use the next "super-type" for a different operation (without naming a specific `type` from the chain), use `type=@next`.
* `(return value?)` \- returns from the current dispatch (either to the parent dispatch or the message sender), optionally including a value to return in instead of `@u` (undefined).  
* `(rr)` \- the object receiving the message (the Mesgjs receiver, which may be a singleton receiver for boxed values)
* `(rt)` \- the receiver type  
* `(smi)` \- the sending-module identifer ("modpath"), for module-signed messages  
* `(sr)` \- the sender (for attributed messages, otherwise undefined)  
* `(st)` \- the sender's type (for attributed messages, otherwise undefined)

**IMPORTANT**: The `@dispatch` interface only accepts attributed messages, so if you want to message the dispatch object from a JavaScript handler, you must use `d.sm(d, op, params?)` or `d.s(d, op, params?)`, not `$c.sm(d, op, params?)`.

### Original Receiver (`orr`) and Receiver Singletons

Starting with Mesgjs v4, many JavaScript types use "receiver singletons" for efficiency. For example, a single `@number` instance handles messaging for *all* JavaScript numbers. When a JavaScript value is boxed as a Mesgjs receiver:

- `(rr)` returns the singleton receiver instance
- `(orr)` returns the original JavaScript value that was boxed

This allows handlers to access the actual JavaScript value when needed, even though the receiver is a singleton.

## JavaScript Object Properties

* `.b` \- code-template binding function (returns a `(run)`-able code-block bound to the current dispatch)
* `.dop` \- current dispatch's requested operation
* `.hop` \- the currently-dispatched handler operation
* `.ht` \- the currently-dispatched handler's interface type
* `.js` \- getter/setter for the receiver's JS-level state (accesses receiver's private JS state)
* `.mop` \- the original message's requested operation
* `.mp` \- the `NANOS` message parameters list
* `.orr` \- the original receiver (before singleton conversion); for boxed JavaScript values, this is the original JavaScript value
* `d.p` \- JIT persistent-storage (protected/shared) `NANOS` getter
* `.t` \- JIT transient-storage (scratch) `NANOS` getter
* `d.x` \- JIT exclusive-storage (private/per-interface) `NANOS` getter
* `.rr` \- the object receiving the message (the Mesgjs receiver, which may be a singleton receiver for boxed values)
* `.rt` \- the receiver type
* `.msjsType` \- the type of the *dispatch* object ("@dispatch")
* `d.s` \- alias for `.sm`; attributed send-message function (use this instead of destructuring `.sm`)
* `d.sm` \- the send-message function (`d.sm(recipient, mesgOp, mesgParams)`); when called on a dispatch object, sends an attributed message
* `.smi` \- the sending-module identifer ("modpath"), for module-signed messages
* `.sr` \- the sending object's public interface/receiver (for attributed messages, otherwise undefined)
* `.st` \- the sender's type (for attributed messages, otherwise undefined)

### Send-Message Functions (`.sm` and `.s`)

The `.sm` property provides the send-message function. When invoked on a `@dispatch` object, it sends an *attributed* message (the sender is known to be the receiver of the current dispatch).

**Important:** Do not destructure `.sm` from `d` (e.g., `const {sm} = d`), as this loses the context required for message attribution. Instead, use `d.s` or `d.sm` directly for attributed messages.

Notably, the dispatch object itself only accepts attributed messages, i.e.: `d.s(d, op, params)`.

For *anonymous* messages from JavaScript handlers, use `$c.sm(receiver, op, params)`.

### ThrowFlow Mechanism

The `throwFlow` mechanism (used by interfaces like `@loop`, `@try`, `@promise`) now uses the main receiver object (`d.rr`) for control properties (`.active`, `.capture`, `.hasFlowRes`, `.flowRes`) rather than the `.js` property. This reduces object allocations in the v4 architecture.

# Module Scope And Mesgjs `@module` Interface

Scope for Mesgjs-module top-level code is established using the following JS code:

`const {d,ls,m,na}=$modScope(), {b,mp}=d;`

Where:

* `b` \- code-template binding function  
* `d` \- a custom dispatch object. It provides the following @dispatch object subset:  
  * Javascript object properties  
    * `d.p` \- JIT module persistent storage `NANOS` getter (same as the module's m.p)  
    * `.op` \- "import"  
    * `.rr` \- receiver (`@module` instance)  
    * `.rt` \- receiver type (`@module`)  
    * `d.s` \- attributed send-message function
    * `.sr` \- sender (same `@module` instance)  
    * `.st` \- sender type (`@module`)  
	* `d.x` \- JIT module exclusive storage `NANOS` getter
  * Mesgjs message operations  
    * Supported: `(op)`, `(rr)`, `(rt)`, `(sr)`, `(st)`
    * Everything else (silently) returns `@u` (undefined)  
* `ls` \- a helper function for generating `NANOS`-based `@list` literals  
* `m` \- an `@module` object instance  
  * Javascript object properties  
    * `m.p` \- JIT module persistent storage `NANOS` getter (same as the dispatch's d.p)  
  * Mesgjs message operations  
    * Every message (silently) returns `@u` (undefined)  
* `na` \- (namespace-at) a variable access helper function
