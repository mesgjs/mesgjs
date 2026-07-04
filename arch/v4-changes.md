# Version 4 Architectural Changes

Mesgjs version 4 is a **significant** (and definitely breaking) architectural refactoring in order to improve performance.

## Mesgjs Objects Before V4

Prior to version 4, Mesgjs objects were "receiver functions" (bound template functions).

Anonymous messages could be sent to them directly using the form `instance(operation, parameters)`. Attributed messages could be sent from a dispatch context send-message function (also a bound template) using the form `d.sm(instance, operation, parameters)` (or, destructuring, `const {sm} = d; sm(...);`).

A simple calculation like `6(* 7)(+ 9)` involved:

1. Creating an `@number` "object" (receiver function) for 6
2. Creating an `@dispatch` "object" for the `*` message
3. Creating a new `@number` "object" for the resulting 42
4. Creating a new `@dispatch` "object" for the `+` message

Unfortunately, JavaScript is not nearly as well tuned for creating lots of bound functions as it is for creating lots of class instance objects (sometimes by roughly an order-of-magnitude difference), which makes the original "receiver function" architecture a significant liability.

V4 aims to address this liablity while the language is still in its infancy and has no significant deployment.

## Mesgjs Objects From V4 On

Mesgjs V4 better aligns with JavaScript's optimization priorities. Objects are now `MsjsObject` class instances instead of functions. Private state leverages ES2022 private elements rather than function closures.

The `MsjsObject` class is a "chameleon" class for the other internal classes, `MsjsCode` (`@code` instance), `MsjsDispatch` (`@dispatch` instance), `MsjsFunction` (`@function` instance), `MsjsInterface` (`@interface` instance), and `MsjsModule` (`@module` instance), as well as for all user interface object instances.

While sub-class specific behaviors are applied by the different sub-classes (e.g. instances of `new MsjsCode` get `@code` behaviors), they are all *defined* within `MsjsObject`. This allows, for example, `MsjsDispatch` objects to see the private elements of other `MsjsObject` "flavors".

The sub-class definitions themselves are minimal, literally e.g. `class MsjsCode extends MsjsObject {};`. The prototypes are defined by an initializer within `MsjsObject` using a mechanism that is essentially
`Object.defineProperties(MsjsCode.prototype, Object.getOwnPropertyDescriptors(MsjsObject.#codePrototype))`. This is how all runtime-defined behaviors are `MsjsObject`-branded (with the cross-instance/"cross-type" access they require in order to function), regardless of "flavor".

User interfaces can use this ultra-efficient prototype approach (minus privileged internal behaviors, of course) via an optional new `proto` setting during interface configuration. When supplied, it gets applied via the instantiation of an anonymous sub-class created by the runtime.

## V4 Messaging API

With Mesgjs objects no longer being functions taking an a message operation and parameters, all messages are sent using `MsjsObject.sm(receiver, operation, parameters)`. This is both a static (class) method and an instance method.

When `this` is a `MsjsDispatch`-flavored object, an attributed message is sent (the sender being known to be the receiver of the message for which the `MsjsDispatch` was created). In any other context, the message is sent anonymously. (It's important to note that, as a result, `sm` can no longer be destructured from `d`, since the context for attribution gets lost; `d.s` (alias for `d.sm`) must be used instead.)

The preferred idiomatic way to send *anonymous* messages is to use the new `$c.sm` binding: `$c.sm(receiver, operation, parameters)`. (As before, parameters, when present, must always be presented as a single value, e.g. a scalar, object, `ls([...])`, `new NANOS(...)`, etc.)

## Reducing Object Allocations

V4 also introduces the concept of receiver singletons.

A receiver singleton allows much more efficient boxing of JavaScript values. For example, a single `@number` instance handles Mesgjs messaging for *all* JavaScript `number` and `bigint` values, and a single `@string` instance handles messaging for *all* JavaScript `string` values.

The value being boxed is available as the "original receiver" (`.orr` property) of the `@dispatch` object for the message. A critical consequence is that you can't get and keep references to different Mesgjs instances for different boxed values. The same singleton receiver instance will be returned each time, and the value does not appear anywhere in its internal state (only in the `@dispatch` object instances).

Singleton receivers can be used for many JavaScript types, including arrays, plain objects, sets, maps, etc.

While an `@dispatch` object is still created for each message, the allocation-and-release overhead for typically short-lifespan objects is significantly reduced when boxing JavaScript values.

## `$toMsjs` And `$msjsReceiver`

The `$toMsjs` helper is now deprecated and should no longer be used in new code.

In order to allow some existing tests to continue to function during transition to the new API, it is now a function factory:

```javascript
// Basic concept (not the actual implementation)
function $toMsjs (rr) {
	return (op, mp) => $c.sm(rr, op, mp);
}
```

This allows some basic functionality tests to continue to work as before (e.g. `const mo = $toMsjs(','); const result = mo('joining', ['a', 'b', 'c'])); /* a,b,c */`), but it behaves something like a *form of promise* (based on a fleeting future value), and doesn't work for e.g. instance equality comparisons (`const a = []; $toMsjs(a) === $toMsjs(a); /* no longer true */`).

The new `$msjsReceiver` function replaces `$toMsjs` in the messaging pipeline. If `sm` is passed a non-Mesgjs receiver, it calls `globalThis.$msjsReceiver` to return the correct receiver (if available, potentially a singleton). The implementation is typically in `mesgjs.esm.js` (like `$toMsjs`) so that different sites can customize this function without modifying the primary runtime files (designated point of customization).

The original receiver is always available via the `@dispatch` object (`(orr)` Mesgjs message or `.orr` JS property).

## `.js` Dispatch Property

The `.js` property of `@dispatch` objects remains available, but is no longer used internally by the runtime in order to reduce the number of separate object allocations. It provides handler-level (getter/setter) access to `MsjsDispatch.#jsState` (default is undefined). The `throwFlow` mechanism now uses the main object (`d.rr`) for control properties (`.active`, `.capture`, `.hasFlowRes`, `.flowRes`).

## Avoiding `@init` Handlers

The runtime avoids creating a dispatch object for `@init` if there is no handler to execute for the operation. Receiver singletons generally no longer need to initialize the `js` property since, in most cases, they can typically now just deal with `d.orr` provided by the runtime messaging pipeline.
