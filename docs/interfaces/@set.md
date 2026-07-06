# Mesgjs `@set` Interface (final, singleton)

This is the interface for Mesgjs objects that wrap JavaScript `Set` instances.

The `@set` interface is a **receiver singleton** — all JavaScript `Set` values share the same `@set` receiver instance. The original JavaScript `Set` is available via `d.orr` in handlers.

## Message Operations

* `(add value...)` / `(+ value...)`
  * Synopsis: Appends one or more values to the Set object. Returns the Set object.
* `(clear)`
  * Synopsis: Removes all elements from the Set object. Returns the Set object.
* `(delete value)` / `(- value)`
  * Synopsis: Removes the specified element from the Set object. Returns `@t` if an element was removed, or `@f` otherwise.
* `(entries)`
  * Synopsis: Returns a new `@list` object that contains an array of `[value, value]` for each element in the Set object, in insertion order.
* `(eq to)`\
  `(@eq to)`
  * Synopsis: Returns `@t` if `to` refers to the identical underlying JS `Set` object (boxed or unboxed).
* `(has value)`
  * Synopsis: Returns `@t` if an element with the specified value exists in the Set object; otherwise `@f`.
* `(keyIter)`
  * Synopsis: Returns a JavaScript iterator that yields the values for each element in the Set object in insertion order (for use by @kvIter).
* `(ne to)`
  * Synopsis: Returns `@t` if `to` does not refer to the identical underlying JS `Set` object.
* `(new from?=source)`
  * Synopsis: Returns a new JavaScript `Set`.
  * If `from` is provided, the new set is populated with the values from `source` (which should be a `@list`, `@set`, or similar iterable).
  * If `from` is not provided, returns an empty set.
  * Note: The returned set is a plain JavaScript `Set`. When used as a message receiver, it will be automatically boxed by the `@set` receiver singleton.
* `(keys)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Set object in insertion order. (This is an alias for `(values)`).
* `(size)`
  * Synopsis: Returns the number of values in the Set.
* `(toList)`
  * Synopsis: Returns a new `@list` object (NANOS instance) wrapping the Set.
* `(values)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Set object in insertion order.
