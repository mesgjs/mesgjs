# Mesgjs @promise Interface

This interface is "bilingual", supporting both JavaScript object properties and Mesgjs messages.

## Mesgjs Message Operations

* (@init resolve=value reject=value)  
  * Synopsis: Instance initializer. If one of the optional resolve or reject values is provided, the promise will be initialized in the fulfilled (resolved) or rejected state (instead of pending), respectively.  
  * @c(get @promise init=\[resolve=value\]) // Equivalent to JS Promise.resolve(value)  
  * @c(get @promise init=\[reject=reason\]) // Equivalent to JS Promise.reject(reason)  
* (all promise…)  
  * Synopsis: The receiver will resolve to a @jsArray of individual results if all promises resolve, or rejects if any promise rejects.  
* (allSettled promise…)  
  * Synopsis: The receiver will resolve to a @jsArray of settlement results for each of the promises.  
  * See below for the format of settlement results.  
* (always onSettled)  
  * Synopsis: Registers a single (run)\-able code block, (call)\-able function block, or plain JavaScript function, onSettled, as both an onResolved and an onRejected handler for the receiver.  
  * Returns a new @promise for chaining.  
* (any promise…)  
  * Synopsis: The receiver will resolve to the value of the first promise that resolves, or will reject if all promises reject.  
* (catch onRejected)  
  * Synopsis: Registers a (run)\-able code block, (call)\-able function block, or plain JavaScript function as an onRejected handler for the receiver.  
  * Returns a new @promise for chaining.  
* (race promise…)  
  * Synopsis: The receiver will resolve or reject based on the first promise to resolve or reject.  
* (reject error)  
  * Synopsis: The receiver will reject with the specified error. Returns @u (undefined).  
  * Note that this operation is equivalent to JS Promise.withResolvers().reject(), *not* Promise.reject(). See (@init) for more information.  
* (resolve result)  
  * Synopsis: The receiver will resolve with the specified result. Returns @u (undefined).  
  * Note that this operation is equivalent to JS Promise.withResolvers().resolve(), *not* Promise.resolve(). See (@init) for more information.  
* (result)  
  * Synopsis: Returns the result if the receiver has resolved, the error if the receiver has rejected, or @u (undefined) if the receiver has not yet settled.  
* (state)  
  * Synopsis: Returns the current promise state (pending, fulfilled, or rejected) of the receiver.  
* (then onResolved onRejected?)  
  * Synopsis: Registers one or two (run)\-able code blocks, (call)\-able function blocks, or plain JavaScript functions as the onResolved handler and optional onRejected handlers, respectively, for the receiver.  
  * Returns a new @promise for chaining.

Mesgjs event handler functions are passed either a resolve=result or reject=reason parameter (code blocks can query the (result)).. JavaScript handlers are just passed the resolution result or rejection reason.

allSettled returns a @jsArray of bilingual-result objects. In Mesgjs, these results are lists of either \[ status=fulfilled value=*value* \] or \[ status=rejected reason=*reason* \]. In JavaScript, the results are NANOS class instances augmented by .status and either .value or .reason properties.

## JavaScript Object Properties

A @promise instance may generated in one of the following ways:

import { getInstance } from 'syscl/runtime.esm.js';  
const p1 \= getInstance('@promise');                       // Like JS Promise.withResolvers()  
const resp \= getInstance('@promise', { resolve: value }); // Like JS Promise.resolve(value)  
const rejp \= getInstance('@promise', { reject: reason }); // Like JS Promise.reject(reason)

Methods and properties correspond to Mesgjs messages as described above.

* .all(...promises)  
* .allSettled(...promises)  
* .always(onSettled)  
* .any(...promises)  
* .catch(onRejected)  
* .then(onResolved, onRejected \= undefined)  
* .race(...promises)  
* .reject(reason) // Promise.withResolvers().reject(), not Promise.reject()\!  
* .resolve(result) // Promise.withResolvers().resolve(), not Promise.resolve()\!  
* .result  
* .state