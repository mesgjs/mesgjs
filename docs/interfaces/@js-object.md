# Mesgjs `@jsObject` Interface (final, singleton)

This interface provides a bridge to native JavaScript `Object` objects, allowing them to be messaged directly within Mesgjs.

The `@jsObject` interface is a **receiver singleton** — all plain JavaScript `Object` values or non-specific object types (depending on the [mesgjs.esm.js](../../src/runtime/mesgjs.esm.js) `msjsReceiver` configuration) share the same `@jsObject` receiver instance. The original JavaScript object is available via `d.orr` in handlers.


This interface mirrors some of the functionality of the JavaScript `Object`.

**Read/write vs. read-only objects:** `@jsObject` uses an internal ownership stamp to distinguish objects it has created from externally-supplied ones. When creating objects with `(new)`, a fresh null-prototype object is created and stamped as owned — write operations (`set`, `=`, `nset`, `==`) work normally on it. All other objects are treated as read-only and write operations throw a `TypeError`.

* `(@jsv)`
  * Synopsis: Returns the underlying native JavaScript `Object` object.
* `(at key... path=[key...] else=elseBlock)`\
`(get key... path=[key...] else=elseBlock)`\
`(@ key... path=[key...] else=elseBlock)`
  * Synopsis: Return the value at the end of the key path (positional or path), if the value is present.
  * RIC values: elseBlock
  * The path option, if present, takes precedence over any positional key path.
  * If there is no value stored at the specified key path and the `else=` parameter is provided, the elseBlock is (run) and its value is returned instead.
  * If there is no value stored at the specified key path and the `else=` parameter is not provided, a `ReferenceError` is thrown.
  * An `(at)` key path will traverse `Array` (`@jsArray`), `Map` (`@map`), `NANOS` (`@list`), plain `Object` (`@jsObject`), and `Set` (`@set`) instances.
* `(entries)`
  * Synopsis: Returns a new JS array of a given object's own enumerable string-keyed property `[key, value]` pairs. Mirrors `Object.entries()`.
* `(eq to)`\
  `(@eq to)`
  * Synopsis: Returns `@t` if `to` refers to the identical underlying JS `Object` (boxed or unboxed).
* `(keys)`
  * Synopsis: Returns a new JS array of a given object's own enumerable property names. Mirrors `Object.keys()`.
* `(keyIter)`
  * Synopsis: A low-level function that returns the JavaScript key-iterator function used by the `@kvIter` interface.
* `(ne to)`
  * Synopsis: Returns `@t` if `to` does not refer to the identical underlying JS `Object`.
* `(new from?=source)`
  * Synopsis: Returns a new JavaScript `Object` with a null prototype.
  * If `from` is provided, the new object is populated with the key/value pairs from `source` (which should be a `@list`, `@map`, or similar iterable with entries).
  * If `from` is not provided, returns an empty object.
  * The returned object is "owned" and supports write operations (`set`, `nset`, etc.).
* `(nset key1=value1 ...)`\
`(== key1=value1 ...)`
  * Synopsis: Sets one or more named properties on the object in a single message. Throws a `TypeError` if the object is read-only (externally-supplied).
* `(set key to=value)`\
`(= key value)`
  * Synopsis: Sets the property `key` on the object to the given `value`. Throws a `TypeError` if the object is read-only (externally-supplied).
* `(size)`
  * Synopsis: Returns the number of own enumerable properties on the object.
* `(toList)`
  * Synopsis: Returns a new Mesgjs `@list` (a `NANOS` object) containing the entries of the object.
* `(values)`
    * Synopsis: Returns a new JS array of a given object's own enumerable property values. Mirrors `Object.values()`.
