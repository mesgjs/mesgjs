# Mesgjs `@js-object` Interface

This interface provides a bridge to native JavaScript `Object` objects, allowing them to be messaged directly within Mesgjs.

Only plain JavaScript objects are automatically promoted to Mesgjs `@jsObject` instances. If you want to use the interface with other objects, you must manually instantiate a `@jsObject`, providing the JS object as an `init` parameter.

This interface mirrors some of the functionality of the JavaScript `Object`.

**Read/write vs. read-only objects:** `@jsObject` uses an internal ownership stamp to distinguish objects it has created from externally-supplied ones. When no argument is passed to `@init`, a fresh null-prototype object is created and stamped as owned — write operations (`set`, `=`, `nset`, `==`) work normally on it. When an external JS object is passed as the `@init` argument, it is treated as read-only and write operations throw a `TypeError`. The ownership stamp travels with the object itself, so if a fresh object's underlying JS value is extracted (e.g. via `@jsv`) and later re-wrapped in a new `@jsObject` instance, it retains its stamp and remains writable.

* `(@init object?)`
  * Synopsis: Initializes the Mesgjs object. If a plain JS `object` is provided, it is used as the backing store and treated as read-only for write operations. If no argument is provided, a fresh owned null-prototype object is created and is fully read/write.
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
* `(keys)`
  * Synopsis: Returns a new JS array of a given object's own enumerable property names. Mirrors `Object.keys()`.
* `(keyIter)`
  * Synopsis: A low-level function that returns the JavaScript key-iterator function used by the `@kvIter` interface.
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
