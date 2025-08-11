# Mesgjs `@dispatch` Interface

Every code block (standard in-line block, function-mode code block, or message-handler block) is passed a `@dispatch` object instance, "`d`", as its only function parameter.

This interface is "bilingual", supporting both JavaScript object properties and Mesgjs messages.

## Mesgjs Message Operations

* `(dop)` \- the current dispatch's requested operation   
* `(ht)` \- the currently-dispatched handler's interface type  
* `(js)` \- returns the JS-level state object, if set \[not sure if this is useful in Mesgjs\]  
* `(log)` \- logs the dispatch object to the JS console  
* `(mop)` \- returns the original message's requested operation   
* `(redis type=type op=op params=mesgParams else=default)` \- redispatch to another handler, optionally specifying a down-chain type, new message operation, or new message parameters. The optional else value is returned instead of `@u` (undefined) if there are no other handlers to dispatch.  
* `(return value?)` \- returns from the current dispatch (either to the parent dispatch or the message sender), optionally including a value to return in instead of `@u` (undefined).  
* `(rr)` \- the object receiving the message  
* `(rt)` \- the receiver type  
* `(smi)` \- the sending-module identifer ("modpath"), for module-signed messages  
* `(sr)` \- the sender (for attributed messages, otherwise undefined)  
* `(st)` \- the sender's type (for attributed messages, otherwise undefined

## JavaScript Object Properties

* `.b` \- code-template binding function (returns a `(run)`-able code-block bound to the current dispatch)  
* `.dop` \- current dispatch's requested operation  
* `.ht` \- the currently-dispatched handler's interface type  
* `.js` \- mirrors `octx.js` (JS-level state), if present  
* `.mop` \- the original message's requested operation  
* `.mp` \- the `NANOS` message parameters list  
* `.octx` \- object context container (from object instantiation)  
* `d.p` \- JIT persistent-storage `NANOS` getter  
* `.rr` \- the object receiving the message ("self" or "this")  
* `.rt` \- the receiver type  
* `.msjsType` \- the type of the *dispatch* object ("@dispatch")  
* `.sm` \- the receiver's private send-message function (sm(recipient, mesgOp, mesgParams))  
* `.smi` \- the sending-module identifer ("modpath"), for module-signed messages  
* `.sr` \- the sending object's public interface/receiver function (for attributed messages, otherwise undefined)  
* `.st` \- the sender's type (for attributed messages, otherwise undefined)  
* `d.t` \- JIT transient-storage (scratch) `NANOS` getter

# Module Scope And Mesgjs `@module` Interface

Scope for Mesgjs-module top-level code is established using the following JS code:

`const {d,ls,m,na}=$modScope(), {b,mp,sm}=d;`

Where:

* `b` \- code-template binding function  
* `d` \- a custom dispatch object. It provides the following @dispatch object subset:  
  * Javascript object properties  
    * `d.p` \- JIT module persistent storage `NANOS` getter (same as the module's m.p)  
    * `.op` \- "import"  
    * `.rr` \- receiver (`@module` instance)  
    * `.rt` \- receiver type (`@module`)  
    * `.sm` \- private send-message function  
    * `.sr` \- sender (same `@module` instance)  
    * `.st` \- sender type (`@module`)  
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

