# Mesgjs Messaging Overview

# Born To Message

Sending messages is, in many cases, the only way to interact with Mesgjs objects.

Each Mesgjs object is represented at the JavaScript level by a `MsjsObject` class instance created by the runtime core at object instantiation. This instance acts as the object's "public interface" and encapsulates the object's persistent state using ES2022 private elements, preventing outside access (i.e. outside of a small zone in the runtime core) to anything the object does not explicitly choose to share.

Here is a simplified JavaScript model of typical Mesgjs object creation internally within the runtime:

```javascript
function getInstance (type) {
    const state = {}; // object-specific state will stem from here
    const receiver = new MsjsObject(type, state);
    return receiver;
}
```

**Anonymous messages** (for which the message sender and sender type are unknown/unverifiable) may be sent, either from another Mesgjs object or directly from JavaScript, by calling the static method `MsjsObject.sm(receiver, mesgOp, mesgParams)`. This method is also available as `$c.sm(receiver, mesgOp, mesgParams)` (through the `@core` singleton `$c`), which is the recommended way to send messages from JavaScript.

Mesgjs also supports sending **attributed messages** (for which the sender and sender type are known with high confidence). This will be covered later in the section on dispatch details.

The static `sm` method launches the messaging pipeline, which will attempt to locate an appropriate message handler (a JavaScript function) based on the object's type and the message operation.

If a suitable handler is found, a message-dispatch object is created to convey the message context, including receiver, type, object state, and other information.

The handler is then called with the dispatch object as its only parameter to actually process the message.

The handler may return a value (or message the dispatch object with a value) to be returned via the `sm` method to the message sender. In the absence of a specific value, the JavaScript value `undefined` (Mesgjs `@u`) will be returned.

Message sending is *synchronous* – the sending code does not resume execution until a reply (even if it's only `@u`/`undefined` or a `Promise`) is received from the receiver.

# Message-Receiver Details

The static `MsjsObject.sm` method (typically accessed as `$c.sm` in JavaScript) accepts three parameters:

`MsjsObject.sm(receiver, mesgOp = undefined, mesgParameters = undefined)`

- **`receiver`**: The recipient (e.g. a `MsjsObject` instance) of the message
- **`mesgOp`**: The message operation (typically a string)
- **`mesgParameters`**: The message parameter object

The message parameter object is typically a Mesgjs list (`NANOS` ("named and numbered ordered storage") JS class instance). Alternatively, the message parameters value can also be a JS `Array` or plain `Object`, or even just a scalar value. These are automatically normalized to NANOS instances by the runtime. See [Message Parameter Normalization](Message-Parameter-Normalization.md) for details.

Additionally, JavaScript values passed as the receiver argument are automatically converted to Mesgjs objects using the internal `$msjsReceiver` function. This conversion creates boxed `MsjsObject` instances for JavaScript primitives and native types.

A few object types (such as `@code`/`@function` and `@dispatch`) have custom message-handling logic with internal, directly-dispatched message handlers in order to implement the rest of the messaging paradigm without infinite recursion or space-time-melting paradoxes.

## Receiver Singletons

For boxed JavaScript values (numbers, strings, booleans, arrays, etc.), Mesgjs v4 uses **singleton receivers** for all values of the same type. This means that all numeric values share the *same* receiver singleton that implements the [@number](interfaces/@number.md:1) interface behavior.

Importantly, in v4 there are effectively *no* separate `MsjsObject` instances representing individual JavaScript primitives (like `5` or `10`) that can be stored or messaged independently. The JavaScript primitive values themselves (e.g., the number `5`, the string `"hello"`) *are* the Mesgjs representation.  Distinctiveness exists at the dispatch level—each message dispatch creates a `MsjsDispatch` object (a specialized `MsjsObject`) for that specific message context, but this is not a persistent representation of the value.

This architectural change eliminates an entire class of "is this object equivalent to some JS value?" issues that existed in pre-v4 versions, where separate boxed instances (created via `$toMsjs(5)`) needed to be compared for equivalence. In v4, `5` is always simply `5`, with no connected wrapper object to confuse matters.

This optimization dramatically improves performance by eliminating redundant object creation overhead. The singleton receiver handles all messages for that type, operating directly on the JavaScript values.

### Original Receiver (`d.orr`)

Within message handlers, the dispatch object provides access to the **original receiver** through the `d.orr` property. For boxed JavaScript values, `d.orr` contains the original JavaScript value (e.g., the actual number, string, or array),
not the `MsjsObject` wrapper.

For user-created Mesgjs objects (those not wrapping JavaScript primitives), `d.orr` typically equals `d.rr` (the receiving `MsjsObject` instance).

This distinction is important when:
- Performing JavaScript-level operations on the underlying value
- Comparing object identity versus value equality
- Understanding object lifecycle and memory management

# Message Dispatch

All the context required in order for a message handler to be able to process a message (such as message operation and parameters, object state, etc) is passed to the handler via a dispatch object (interface [@dispatch](interfaces/@dispatch-@module.md:1)).

Dispatch objects provide a hybrid, "bilingual", JavaScript/Mesgjs interface, allowing handlers to easily be implemented in either language.

Mesgjs handlers can message the dispatch object for message details. When invoking a handler, the dispatch object will also generate and return Mesgjs lists (JS `NANOS`) for (cross-type shared) persistent object property, type-specific persistent object property, and transient (scratch) storage (`%`, '%%', and `#`, respectively) upon first access.

JavaScript handlers can message the dispatch object too, but for convenience, the same information is available as traditional JavaScript properties of the dispatch object as well. JavaScript handlers typically set up and manage their own persistent and scratch storage as needed.

See the "Mesgjs [@dispatch](interfaces/@dispatch-@module.md:1) Interface" documentation for dispatch-object details.

## Message Redispatch

Handlers can also request a redispatch of the message to a different interface or with a different message operation or message parameters. This is like a "super" call in JavaScript or other languages.

Redispatches are always constrained by the interface flat-chain of the handler type that is currently responding to the message, which is not necessarily the original type or associated flat-chain of the receiving (messaged) object.

Message operations and parameters are inherited across redispatches unless the initiating dispatch provides new ones, in which case the new values become the inherited default values for deeper redispatches in that branch of the redispatch call tree.

If the message op is changed on redispatch, the redispatch may be to handlers for any type in the current handler's flat-chain, including the current type (possibly finding a sibling handler, or potentially even the same handler). If unchanged, the currently responding handler's type is excluded from its flat-chain for the search (forcing search results to progressively less-chained interfaces).

Redispatches get their own dispatch objects, and return their values to the parent dispatch that launched them, rather than the original message sender.

New dispatch objects also get a new Mesgjs list (`NANOS`) for scratch storage (`#`) upon first access. Of course, once allocated, list/NANOS for Mesgjs persistent object storage (`%` and/or `%%`) are always reused (thus manifesting the persistence).

## Attributed Send-Message Function

When a standard Mesgjs object receives a message, the runtime knows it, because it created the `MsjsObject` instance. It is 100% certain of the receiving object's identity, because the identity is passed to the messaging pipeline from trusted scope.

Dispatch objects are created within the runtime core, and take advantage of the receiver identity certainty to provide a send-message function (`.sm`) that enables **attributed messaging**—messages where the recipient can verify the sender's identity and type.

The send-message function on the dispatch object (`d.sm`) takes the same three parameters as the static method: a recipient (such as an `MsjsObject` instance), a message operation, and message parameters.

```javascript
// Within a message handler:
d.sm(otherObject, 'someOperation', params);
```

**Important:** The `d.sm` method maintains the correct dispatch context and should not be destructured from `d`. Always call it as `d.sm(...)` or use the shorthand alias `d.s(...)` to preserve context.

In v4, there is a single implementation of the `sm` function that is referenced in both the `MsjsObject` class prototype and instance prototype. The function detects whether its `this` context is a `MsjsDispatch` object (a dispatch). If so, it uses the original receiver of the dispatch (the object currently processing a message) as the *sender* of the new message being sent. This allows the recipient to know who sent the message and trust that identity, as it comes from the runtime's secure messaging infrastructure.

The recipient's dispatch object will contain sender information (accessible via dispatch properties like `d.st` for sender type) that can be used for capability checking, access control, or other sender-aware logic.

## List-Op Messages

In place of a (scalar) message operation, you can supply a list. Messages sent this way are called a "list-op" messages.

The mandatory operation may be supplied either as the first positional value in the list, or as a parameter named `op`. If you include a parameter named `params`, its value will be supplied as the message parameters instead of the ones in normal position (i.e. the ones following the op value in the message).

Normally, an object must have handlers for each of the types of messages you send it or it will "throw an exception" (error), but there are two exceptions to that:

* First, you can register an `@default` handler for an interface. This handler will be dispatched to handle any message that does not have its own handler. (You can also register an `@defacc` handler to moderate which message operations will be accepted by the `@default` handler. This handler is passed a message operation and handler type and must return `@t` (true) or `@f` (false) depending on whether or not that message operation should be accepted.)

* Second, you can send a list-op message and include an `else` parameter. The value of this will be returned as the result of the message in the case that there is no handler (AND no [@default](interfaces/@core-etc.md:1) handler) eligible to handle the message. If the value is a code block, it will be `(run)` and its return value, if any, will be used as the message's return value instead:  
  `$c.sm(object, { op: 'noSuchOp', else: elseExpression }, messageParams)`

### "Data Bus" Message Parameters

A message's parameters are generally passed as a [@list](interfaces/@list.md:1) (JS `NANOS`) instance. In the traditional, non-list-op mode, this list is anonymous and essentially write-only/write-once from the perspective of the sending object. You can use a list literal the same way when using the list-op mode, but you don't have to – you can use a stored list instance instead.

From JavaScript, you can send a list-op message with explicit parameters:

```javascript
// Anonymous parameters (created inline)
$c.sm(object, { op: 'someOp', params: messageParams });
```

Or you can reuse a stored parameter list, allowing bidirectional communication:

```javascript
// Named parameters (can be observed/mutated by both sender and receiver)
const sharedParams = new NANOS();
sharedParams.set('key', 'value');
$c.sm(object, { op: 'someOp', params: sharedParams });
// Both sender and receiver can now access and modify sharedParams
```

In the second form, the sender is able to both mutate the message parameters after sending the message, and to observe mutations made by the receiving object, allowing for the possibility of a bidirectional "data bus" (or "pipe") between the objects. In conjunction with [@reactive](interfaces/@reactive.md:1) reactive values, automatic reactive recalculations and side-effects are possible.

## Module-Signed Messages

If a message is sent using a "list-op"-style message, including a `mid` attribute with the module's runtime-assigned ID in the list-op value will result in the message being a "module-signed message".

`$c.sm(receiver, { op: 'operation', mid }, parameters)`

When sending module-signed messages, the runtime messaging pipeline will include the sending-module identifier (the sending module's "modpath" value) in the receiver's dispatch object, accessible as `@d(smi)` from Mesgjs or `d.smi` from JavaScript.

The receiver does not gain access to the sender's mid via the list-op; it is only accessible to the Mesgjs runtime system. (Just be sure you're putting it in the list-op and not in the message parameters, especially if you're using list-op `params=` to supply message parameters.)

The sending-module identifier is useful for looking up access-controlled capabilities in the runtime module meta-data (under the `modcaps` key).

For non-module-signed messages, the `smi` value is `@u`/`undefined`.

Module-signing of messages works for both anonymous messages (e.g. from JavaScript) and attributed messages (between two runtime-created Mesgjs objects).

## `@eq` Equality Protocol, `@jsv` Message

The `@eq` message operation is a reserved, `@`-prefixed protocol name used for object comparisons. It is used by the `@c` (core) comparison and `(case)` operations.

Core equality operations include:
- `@c(eq value1 value2)` / `@c(= value1 value2)` — value equality test
- `@c(ne value1 value2)` / `@c(!= value1 value2)` — value inequality test
- and `@c(case ref val1 act1 ...)` (case switching)

Objects that do not implement `@eq` will be compared using JS `===` (object
identity) as a fallback.

The `@jsv` companion message is used for returning corresponding JavaScript-level
values (e.g., `5` for a [@number](interfaces/@number.md:1)-messaged value).

## See Also

- [Message Parameter Normalization](Message-Parameter-Normalization.md) - How JavaScript values are converted to message parameters
- [JavaScript Interface Development](JavaScript-Interface-Development.md) - Creating message handlers
- [JavaScript Runtime Reference](JavaScript-Runtime-Reference.md) - Runtime API reference
- [[@list](interfaces/@list.md:1) Interface](interfaces/@list.md) - The NANOS/list interface documentation
