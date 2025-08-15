# Mesgjs `@js-object` Interface

This interface provides a bridge to native JavaScript `Object` objects, allowing them to be messaged directly within Mesgjs.

Only plain JavaScript objects are automatically promoted to Mesgjs `@jsObject` instances. If you want to use the interface with other objects, you must manually instantiate a `@jsObject`, providing the JS object as an `init` parameter.

This interface mirrors some of the functionality of the JavaScript `Object`.

* `(@init object)`
  * Synopsis: Initializes the Mesgjs object with a given JavaScript `object`.
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
* `(set key to=value)`\
`(= key value)`
  * Synopsis: Sets the property `key` on the object to the given `value`.
* `(size)`
  * Synopsis: Returns the number of own enumerable properties on the object.
* `(toList)`
  * Synopsis: Returns a new Mesgjs `@list` (a `NANOS` object) containing the entries of the object.
* `(values)`
    * Synopsis: Returns a new JS array of a given object's own enumerable property values. Mirrors `Object.values()`.