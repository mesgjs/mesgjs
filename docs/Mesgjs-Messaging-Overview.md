# Mesgjs Messaging Overview

# Born To Message

Sending messages is, in many cases, the only way to interact with Mesgjs
objects.

Each Mesgjs object is represented at the JavaScript level by a unique
"message-receiver" function, created by the runtime core at object
instantiation, that acts as its "public interface". This function also
encapsulates the object's persistent state, preventing outside access (i.e.
outside of a small zone in the runtime core) to anything the object does not
explicitly choose to share.

Here is a simplified JavaScript model of typical Mesgjs object creation:

```javascript
function getInstance (type) {
    const state = {}; // object-specific state will stem from here
    const receiver = function mesgReceiver (mesgOp, mesgParams) {
        return processMessage({ receiver, type, state, mesgOp, mesgParams });
    };
    return receiver;
}
```

**Anonymous messages** (for which the message sender and sender type are
unknown/unverifiable) may be sent, either from another Mesgjs object or directly
from JavaScript, by directly calling the object's message-receiver function,
passing it a message operation and message parameters.

Mesgjs also supports sending **attributed messages** (for which the sender and
sender type are known with high confidence). This will be covered later in the
section on dispatch details.

The message-receiver function launches the rest of the messaging pipeline, which
will attempt to locate an appropriate message handler (another JavaScript
function) based on the object's type and the message operation.

If a suitable handler is found, a message-dispatch object is created to convey
the message, receiver, type, object state, and other information.

The handler is then called with the dispatch object as its only parameter to
actually process the message.

The handler may return a value (or message the dispatch object with a value) to
be returned via the message-receiver function to the message sender. In the
absence of a specific value, the JavaScript value `undefined` (Mesgjs `@u`) will be
returned.

Message sending is *synchronous* – the sending code does not resume execution until
a reply (even if it's only `@u`/`undefined` or a `Promise`) is received from the receiver.

# Message-Receiver Details

Message-receiver functions accept zero, one, or two function-call parameters.
The first function-call parameter is a message operation. The second
function-call parameter is a message parameter object:

`mesgReceiver(mesgOp = undefined, mesgParameters = undefined)`

The message parameter object is typically a Mesgjs list (`NANOS` ("named and
numbered ordered storage") JS class instance). Alternatively, the message
parameters value can also be a JS `Array` or plain `Object`, or even just a scalar
value, when called from JS.

Typically these functions invoke a generic message-processing function which is
responsible for the remainder of the messaging pipeline.

A few object types (such as `@code`/`@function` and `@dispatch`) have custom receiver
functions with internal, directly-dispatched message handlers in order to
implement the rest of the messaging paradigm without infinite recursion or
space-time-melting paradoxes.

# Message Dispatch

All the context required in order for a message handler to be able to process a
message (such as message operation and parameters, object state, etc) is passed
to the handler via a dispatch object (interface @dispatch).

Dispatch objects provide a hybrid, "bilingual", JavaScript/Mesgjs interface,
allowing handlers to easily be implemented in either language.

Mesgjs handlers can message the dispatch object for message details. When
invoking a handler, the dispatch object will also generate and return Mesgjs
lists (JS `NANOS`) for persistent object property and transient (scratch) storage
(`%` and `#`, respectively) upon first access.

JavaScript handlers can message the dispatch object too, but for convenience,
the same information is available as traditional JavaScript properties of the
dispatch object as well. JavaScript handlers typically set up and manage their
own persistent and scratch storage as needed.

See the "Mesgjs @dispatch Interface" documentation for dispatch-object details.

## Message Redispatch

Handlers can also request a redispatch of the message to a different interface
or with a different message operation or message parameters. This is like a
"super" call in JavaScript or other languages.

Redispatches are always constrained by the interface flat-chain of the handler
type that is currently responding to the message, which is not necessarily the
original type or associated flat-chain of the receiving (messaged) object.

Message operations and parameters are inherited across redispatches unless the
initiating dispatch provides new ones, in which case the new values become the
inherited default values for deeper redispatches in that branch of the
redispatch call tree.

If the message op is changed on redispatch, the redispatch may be to handlers
for any type in the current handler's flat-chain, including the current type
(possibly finding a sibling handler, or potentially even the same handler). If
unchanged, the currently responding handler's type is excluded from its
flat-chain for the search (forcing search results to progressively less-chained
interfaces).

Redispatches get their own dispatch objects, and return their values to the
parent dispatch that launched them, rather than the original message sender.

New dispatch objects also get a new Mesgjs list (`NANOS`) for scratch storage (`#`)
upon first access. Of course, once allocated, a list/NANOS for Mesgjs persistent
object storage (`%`) is always reused (thus manifesting its persistence).

## Attributed Send-Message Function

When a standard Mesgjs object receives a message, the runtime knows it, because
it created the receiver function. It is 100% certain of the receiving object's
identity, because the identity is passed to the messaging pipeline from trusted
scope.

Dispatch objects are created within the runtime core, and take advantage of the
receiver identity certainty to include a private send-message function _specific
to that object_ (also with core runtime scope) that only the message handlers
can access (as long as they don't leak it).

The send-message function takes *three* parameters: a recipient object (receiver
function), a message operation, and message parameters.

It stores these, along with the known sender and sender type, within a "message
baton" inside the runtime core (inaccessible to anything outside the runtime
core).

The send-message function then immediately calls the recipient receiver function
*with **no** parameters*.

The messaging pipeline, seeing that the receiver was invoked without the
mandatory (for message dispatch, optional as a receiver call parameter) message
operation, checks the message baton. Upon confirming that the message recipient
in the baton matches the responding object, it saves the message and sender
information from the baton, clears the baton, and processes the securely-passed
message from the known sender.

## List-Op Messages

In place of a (scalar) message operation, you can supply a list. Messages sent this way are called a "list-op" messages.

The mandatory operation may be supplied either as the first positional value in the list, or as a parameter named `op`. If you include a parameter named `params`, its value will be supplied as the message parameters instead of the ones in normal position (i.e. the ones following the op value in the message).

Normally, an object must have handlers for each of the types of messages you send it or it will "throw an exception" (error), but there are two exceptions to that:

* First, you can register an `@default` handler for an interface. This handler will be dispatched to handle any message that does not have its own handler. (You can also register an `@defacc` handler to moderate which message operations will be accepted by the `@default` handler. This handler is passed a message operation and handler type and must return `@t` (true) or `@f` (false) depending on whether or not that message operation should be accepted.)

* Second, you can send a list-op message and include an `else` parameter. The value of this will be returned as the result of the message in the case that there is no handler (AND no @default handler) eligible to handle the message. If the value is a code block, it will be `(run)` and its return value, if any, will be used as the message's return value instead:  
  `object([noSuchOp else={ otherObj(otherMessage) !}] message params…)`

### "Data Bus" Message Parameters

A message's parameters are generally passed as a `@list` (JS `NANOS`) instance. In the traditional, non-list-op mode, this list is anonymous and essentially write-only/write-once from the perspective of the sending object. You can use a list literal the same way when using the list-op mode, but you don't have to – you can use a stored list instance instead.

```
object([op params=[message params]]) // list-op with list-literal message params
#(nset params=[message params])
object([op params=#params]) // list-op with named message params
```

In the second form, the sender is able to both mutate the message parameters after sending the message, and to observe mutations made by the receiving object, allowing for the possibility of a bidirectional "data bus" (or "pipe") between the objects. In conjunction with `@reactive` reactive values, automatic reactive recalculations and side-effects are possible.

## Module-Signed Messages

If a message is sent using a "list-op"-style message, including a `mid`
attribute with the module's runtime-assigned ID in the list-op value will
result in the message being a "module-signed message".

`receiver([operation mid=@mid] parameters)`

When sending module-signed messages, the runtime messaging pipeline will include
the sending-module identifier (the sending module's "modpath" value) in the
receiver's dispatch object, accessible as `@d(smi)` from Mesgjs or `d.smi`
from JavaScript.

The receiver does not gain access to the sender's mid via the list-op; it is
only accessible to the Mesgjs runtime system. (Just be sure you're putting it
in the list-op and not in the message parameters, especially if you're using
list-op `params=` to supply message parameters.)

The sending-module identifier is useful for looking up access-controlled
capabilities in the runtime module meta-data (under the `modcaps` key).

For non-module-signed messages, the `smi` value is `@u`/`undefined`.

Module-signing of messages works for both anonymous messages (e.g. from
JavaScript) and attributed messages (between two runtime-created Mesgjs
objects).
