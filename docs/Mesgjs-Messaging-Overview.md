# Mesgjs Messaging Overview

# Born To Message

Sending messages is, in many cases, the only way to interact with Mesgjs objects.

Each Mesgjs object is represented at the JavaScript level by a unique "message-receiver" function, created by the runtime core at object instantiation, that acts as its "public interface". This function also encapsulates the object's persistent state, preventing outside access (i.e. outside of a small zone in the runtime core) to anything the object does not explicitly choose to share.

Here is a  simplified JavaScript model of typical Mesgjs object creation:

function getInstance (type) {  
    const state \= {}; // object-specific state will stem from here  
    const receiver \= function mesgReceiver (mesgOp, mesgParams) {  
        return processMessage({ receiver, type, state, mesgOp, mesgParams });  
    };  
    return receiver;  
}

**Anonymous messages** (for which the message sender and sender type are unknown/unverifiable) may be sent, either from another Mesgjs object or directly from JavaScript, by directly calling the object's message-receiver function, passing it a message operation and message parameters.

Mesgjs also supports sending **attributed messages** (for which the sender and sender type are known with high confidence). This will be covered later in the section on dispatch details.

The message-receiver function launches the rest of the messaging pipeline, which will attempt to locate an appropriate message handler (another JavaScript function) based on the object's type and the message operation.

If a suitable handler is found, a message-dispatch object is created to convey the message, receiver, type, object state, and other information.

The handler is then called with the dispatch object as its only parameter to actually process the message.

The handler may return a value (or message the dispatch object with a value) to be returned via the message-receiver function to the message sender. In the absence of a specific value, the JavaScript value undefined (Mesgjs @u) will be returned.

# Message-Receiver Details

Message-receiver functions accept zero, one, or two function-call parameters. The first function-call parameter is a message operation. The second function-call parameter is a message parameter object:

mesgReceiver(mesgOp \= undefined, mesgParameters \= undefined)

The message parameter object is typically a Mesgjs list (NANOS ("named and numbered ordered storage") JS class instance). Alternatively, the message parameters value can also be a JS array or plain object, or even just a scalar value, when called from JS.

Typically these functions invoke a generic message-processing function which is responsible for the remainder of the messaging pipeline.

A few object types (such as @code/@function and @dispatch) have custom receiver functions with internal, directly-dispatched message handlers in order to implement the rest of the messaging paradigm without infinite recursion or space-time-melting paradoxes.

# Message Dispatch

All the context required in order for a message handler to be able to process a message (such as message operation and parameters, object state, etc) is passed to the handler via a dispatch object (interface @dispatch).

Dispatch objects provide a hybrid, "bilingual", JavaScript/Mesgjs interface, allowing handlers to easily be implemented in either language.

Mesgjs handlers can message the dispatch object for message details. When invoking a handler, the dispatch object will also generate and return Mesgjs lists (JS NANOS) for persistent object property and transient (scratch) storage (% and \#, respectively) upon first access.

JavaScript handlers can message the dispatch object too, but for convenience, the same information is available as traditional JavaScript properties of the dispatch object as well. JavaScript handlers typically set up and manage their own persistent and scratch storage as needed.

See the "Mesgjs @dispatch Interface" documentation for dispatch-object details.

## Message Redispatch

Handlers can also request a redispatch of the message to a different interface or with a different message operation or message parameters. This is like a "super" call in JavaScript or other languages.

Redispatches are always constrained by the interface flat-chain of the handler type that is currently responding to the message, which is not necessarily the original type or associated flat-chain of the receiving (messaged) object.

Message operations and parameters are inherited across redispatches unless the initiating dispatch provides new ones, in which case the new values become the inherited default values for deeper redispatches in that branch of the redispatch call tree.

If the message op is changed on redispatch, the redispatch may be to handlers for any type in the current handler's flat-chain, including the current type (possibly finding a sibling handler, or potentially even the same handler). If unchanged, the currently responding handler's type is excluded from its flat-chain for the search (forcing search results to progressively less-chained interfaces).

Redispatches get their own dispatch objects, and return their values to the parent dispatch that launched them, rather than the original message sender.

New dispatch objects also get a new Mesgjs list (NANOS) for scratch storage (\#) upon first access. Of course, once allocated, a list/NANOS for Mesgjs persistent object storage (%) is always reused (thus manifesting its persistence).

## Attributed Send-Message Function

When a standard Mesgjs object receives a message, the runtime knows it, because it created the receiver function. It is 100% certain of the receiving object's identity, because the identity is passed to the messaging pipeline from trusted scope.

Dispatch objects are created within the runtime core, and take advantage of the receiver identity certainty to include a private send-message function *specific to that object* (also with core runtime scope) that only the message handlers can access (as long as they don't leak it).

The send-message function takes *three* parameters: a recipient object (receiver function), a message operation, and message parameters.

It stores these, along with the known sender and sender type, within a "message baton" inside the runtime core (inaccessible to anything outside the runtime core).

The send-message function then immediately calls the recipient receiver function *with **no** parameters*.

The messaging pipeline, seeing that the receiver was invoked without the mandatory (for message dispatch, optional as a receiver call parameter) message operation, checks the message baton. Upon confirming that the message recipient in the baton matches the responding object, it saves the message and sender information from the baton, clears the baton, and processes the securely-passed message from the known sender.  
