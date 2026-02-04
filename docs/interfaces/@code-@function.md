# Mesgjs `@code` Interface

`@code` object instances are created from code-block literals (`{ }` and `{ !}`) when those literals are referenced in Mesgjs code. These instances capture the dispatch context in which they were created, and can be executed via the `(run)` message or converted to functions via the `(fn)` message.

There are no RIC values in this interface.

* `(fn params...)  `
  * Synopsis: Returns an `@function` object instance for the associated code block.
  * Any parameters become the `%` (persistent state) of the `@function` object.
  * Passing lists and/or list-item accessors here is the typical Mesgjs pattern for functions requiring access to otherwise out-of-scope resources (avoidable use of e.g. `%*` and/or `%/` is generally discouraged).
* `(run)`
  * Synopsis: Executes the associated code block.

# Mesgjs `@function` Interface

`@function` object instances are created by sending the `(fn)` message to a `@code` object instance or to an existing `@function` instance. Unlike `@code` instances, functions run in a fresh dispatch context each time they are called, with their persistent state (`%`) initialized from the parameters passed to the `(fn)` message.

There are no RIC values in this interface.

* `(call params...)`
  * Synopsis: Executes the `@function`'s associated code, passing any parameters (accessible via the `!` namespace).
* `(fn params...)`
  * Synopsis: Returns a new `@function` object instance for the associated code block.
  * (Works the same way as `(fn)` on the original `@code` object.)  
* `(jsfn)`
  * Synopsis: Returns a raw JavaScript function that will send a `(call)` message (with any supplied parameters) to the `@function` object.
