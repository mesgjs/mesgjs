# Mesgjs `@promise` Interface

A "promise" in JavaScript (`@promise` instance in Mesgjs) is a placeholder for a future result. It allows you to specify (right now) what should happen when (sometime in the future) a result becomes available or an error occurs.

The interface is "bilingual", supporting both JavaScript object properties and Mesgjs messages.

## Mesgjs Message Operations

* `(@init resolve=value reject=value)`
  * Synopsis: Instance initializer. If one of the optional `resolve` or `reject` values is provided, the promise will be initialized in the fulfilled (resolved) or rejected state (instead of pending), respectively.
  * `@c(get @promise init=[resolve=value]) // Equivalent to JS Promise.resolve(value)`
  * `@c(get @promise init=[reject=reason]) // Equivalent to JS Promise.reject(reason)`
* `(all promise...)`
  * Synopsis: Resolves to a `@jsArray` of individual results if all promises resolve, or rejects if any promise rejects. Resolves to an empty `@jsArray` if there are no promises.
* `(allSettled promise...)`
  * Synopsis: Resolves to a `@jsArray` of bilingual settlement results for each of the promises. Resolves to an empty `@jsArray` if there are no promises.
  * See below for the format of settlement results.
* `(always onSettled)`
  * Synopsis: Registers a single `(run)`\-able `@code` block, `(call)`\-able `@function` block, or plain JavaScript function, `onSettled`, as both an `onResolved` and an `onRejected` handler for the receiver.
  * Returns a new `@promise` for chaining.
* `(any promise...)`
  * Synopsis: The receiver will resolve to the value of the first promise that resolves, or reject if all promises reject. Rejects if there are no promises.
* `(cancel)`
  * Synopsis: Cancels any pending timed resolution (see `(wait)`).
* `(catch onRejected)`
  * Synopsis: Registers a `(run)`\-able `@code` block, `(call)`\-able `@function` block, or plain JavaScript function as an `onRejected` handler for the receiver.
  * Returns a new `@promise` for chaining.
* `(message)`
  * Synopsis: Returns the message part of the error if rejected, or else `@u`.
* `(race promise...)`
  * Synopsis: The receiver will resolve or reject based on the first promise to resolve or reject. **Important**: *Per the standard*, empty races will hang, unsettled! (A console warning will be generated in this case.)
* `(reject error)`
  * Synopsis: The receiver will reject with the specified error. Returns `@u` (undefined).
  * Note that this operation is equivalent to JS `Promise.withResolvers().reject()`, *not* `Promise.reject()`. See `(@init)` for more information.
* `(resolve result)`
  * Synopsis: The receiver will resolve with the specified result. Returns `@u` (undefined).
  * Note that this operation is equivalent to JS `Promise.withResolvers().resolve()`, *not* `Promise.resolve()`. See `(@init)` for more information.
* `(result)`
  * Synopsis: Returns the result if the receiver has resolved, the error if the receiver has rejected, or `@u` (undefined) if the receiver has not yet settled.
* `(state)`
  * Synopsis: Returns the current promise state (`pending`, `fulfilled`, or `rejected`) of the receiver.
* `(then onResolved onRejected?)`
  * Synopsis: Registers one or two `(run)`\-able `@code` blocks, `(call)`\-able `@function` blocks, or plain JavaScript functions as the `onResolved` handler and optional `onRejected` handlers, respectively, for the receiver.
  * Returns a new `@promise` for chaining.
* `(wait msec result?)`
  * Synopsis: Cancels any pending timed resolution, and then schedules resolution to `result` in (at least) `msec` milliseconds.
  * If `result` is a Mesgjs `@code` block, it will be `(run)`. If `result` is a JavaScript function, it will be called with no parameters. Otherwise, the value (default `@u`/`undefined`) is passed directly to `(resolve)`.
  * JavaScript's `setTimeout`/`clearTimeout` mechanism is used internally.

Event handlers may be Mesgjs `@code` blocks, `@function` blocks, or plain JavaScript functions.

Since `@code` blocks can't be passed parameters when `(run)`, they must access whatever they need by messaging the promise instance, using e.g. `(state)` and `(result)`.

`@function` handlers will be passed either `[state=state resolve=result]` or `[state=state reject=reason message=message]`, where `reason` is a JavaScript `Error` object, and `message` is the error's message text.

JavaScript handlers are just passed the resolution result or rejection reason.

`(allSettled)` returns a `@jsArray` of bilingual-result objects. In Mesgjs, each result in the array is either a list containing `[ status=fulfilled value=`_`value`_` ]` or a list containing `[ status=rejected reason=`_`reason`_` ]`. In JavaScript, each result is a `NANOS` class instances augmented by `.status` and either `.value` or `.reason` properties.

## JavaScript Object Properties

A `@promise` instance may generated in one of the following ways:

```
import { getInstance } from './runtime.esm.js'; // In foundational interfaces
const { getInstance } = globalThis.$c;          // Everywhere else
const p1 = getInstance('@promise');                       // Like JS Promise.withResolvers()
const resp = getInstance('@promise', { resolve: value }); // Like JS Promise.resolve(value)
const rejp = getInstance('@promise', { reject: reason }); // Like JS Promise.reject(reason)
```

Methods and properties correspond to Mesgjs messages as described above.

* `.all([promises])`
* `.allSettled([promises])`
* `.always(onSettled)`
* `.any([promises])`
* `.cancel()`
* `.catch(onRejected)`
* `.then(onResolved, onRejected = undefined)`
* `.race([promises])`
* `.reject(reason) // Promise.withResolvers().reject(), not Promise.reject()!`
* `.resolve(result) // Promise.withResolvers().resolve(), not Promise.resolve()!`
* `.result`
* `.state`
* `.wait(msec, result) // similar to setTimeout(() => resolve(result), msec)`
