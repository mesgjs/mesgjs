# Mesgjs @reactive Interface (final, singleton)

Reactive values in Mesgjs are similar to spreadsheet cells. They may be assigned either a static value, or a "def" (a definition, like a spreadsheet formula) that is used to calculate the value. Changes to reactive values automatically trigger recalculations of any other reactive values whose definitions depend on the modified values.

Derived values are normally only recalculated if used in the definitions of other values or directly accessed ("lazy evaluation"), but this may be overridden by setting specifying that recalculation should be "eager".

The `@reactive` interface is a **receiver singleton** — all reactive JavaScript objects share the same `@reactive` receiver instance. The original JavaScript reactive object is available via `d.orr` in handlers.

## Message Operations

* `(@jsv)`
  * Synopsis: Returns the underlying JavaScript reactive object.  
* `(batch block)`
  * Synopsis: (run) the block, deferring reactive recalculations until the end of the batch (and any enclosing batches) as much as possible, and return the result.  
  * RIC values: block  
* `(def)`
  * Synopsis: Returns the current def(inition) JavaScript function, or @u (undefined) if currently set to a static value.  
  * As a JavaScript function, this is probably mostly useful as a boolean-like, set/not-set value in Mesgjs.  
* `(eager)`
  * Synopsis: Returns @t (true) if def(ined) values are set to be eagerly recalculated, otherwise returns @f (false).  
  * By default, def(ined) values are recalculated lazily, unless consumed by other reactive calculations.  
* `(eq to)`\
  `(@eq to)`
  * Synopsis: Returns `@t` if `to` refers to the identical underlying reactive JavaScript object (boxed or unboxed).
* `(error)`
  * Synopsis: If a def(ined) value calculation generated an exception (or error), this operation will return it; otherwise it returns @u (undefined)
* `(fv)`
  * Synopsis: Traverses any chained reactive values and returns the final, non-reactive, value.  
* `(ne to)`
  * Synopsis: Returns `@t` if `to` does not refer to the identical underlying reactive JavaScript object.
* `(new v? cmp?=cmp def?=def eager=bool v?=value)`
  * Synopsis: Creates a new reactive JavaScript object.
  * RIC values: cmp, def
  * The comparison block (`cmp`) determines when the reactive value has changed.
  * The definition block (`def`) is a "formula" that calculates the value.
  * If `eager` is true, the value is recalculated eagerly instead of lazily.
  * The initial value can be set with `v` or a positional parameter.
  * Note: The returned reactive object is a plain JavaScript reactive. When used as a message receiver, it will be automatically boxed by the `@reactive` receiver singleton.
* `(rio)`
  * Synopsis: Returns a RIO (reactive interface object) based on the current reactive.
  * A RIO is used to provide limited reactive support to other objects (e g., @list) in an implementation-independent manner.
* `(rv)`
  * Synopsis: Reads and returns the current value (either static, or calculated from the def(inition)).  
* `(set)`
  * Synopsis: Updates the reactive value's properties.
  * Parameters can include `def=defBlock`, `eager=bool`, and `v=value` (or a positional value).
  * Returns the instance for chaining.
* `(unready)`
  * Forces the state for a defined reactive to unready. The definition will be re-evaluated upon the next access.
* `(untr block)`
  * Synopsis: `(run)` the block, untracked (without recording reactive dependencies), and return the result.  
  * RIC values: block
* `(wait)`
  * Synopsis: Returns a promise that resolves when pending reactive recalculations have completed.

## JavaScript Interface

* `.jsv`, `.valueOf()`
  * Synopsis: Returns the underlying `reactive` JavaScript object.
