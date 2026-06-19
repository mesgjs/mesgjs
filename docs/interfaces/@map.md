# Mesgjs `@map` Interface

This is the interface for Mesgjs objects that wrap JavaScript `Map` instances.

* `(@init map)`
  * Synopsis: Create a new map, optionally providing a JavaScript `Map` object to wrap.
* `(at key... path=[key...] else=elseBlock)`\
`(get key... path=[key...] else=elseBlock)`
`(@ key... path=[key...] else=elseBlock)`
  * Synopsis: Return the value at the end of the key path (positional or path), if the value is present.  
  * RIC values: elseBlock  
  * The path option, if present, takes precedence over any positional key path.  
  * If there is no value stored at the specified key path and the `else=` parameter is provided, the elseBlock is (run) and its value is returned instead.  
  * If there is no value stored at the specified key path and the `else=` parameter is not provided, a `ReferenceError` is thrown.
  * An `(at)` key path will traverse `Array` (`@jsArray`), `Map` (`@map`), `NANOS` (`@list`), plain `Object` (`@jsObject`), and `Set` (`@set`) instances.
* `(clear)`
  * Synopsis: Removes all elements from the Map object.  
* `(delete key)`
  * Synopsis: Removes the specified element from the Map object by key. Returns `@t` if an element was removed, or `@f` otherwise.
* `(entries)`
  * Synopsis: Returns a new `@list` object that contains an array of `[key, value]` for each element in the Map object, in insertion order.
* `(eq to)`\
  `(@eq to)`
  * Synopsis: Returns `@t` if `to` refers to the identical underlying JS `Map` object (boxed or unboxed).
* `(has key)`
  * Synopsis: Returns `@t` if an element with the specified key exists in the Map object; otherwise `@f`.
* `(keyIter)`
  * Synopsis: Returns a JavaScript iterator that yields the keys for each element in the Map object in insertion order (for use by @kvIter).
* `(keys)`
  * Synopsis: Returns a new `@list` that contains the keys for each element in the Map object in insertion order.
* `(ne to)`
  * Synopsis: Returns `@t` if `to` does not refer to the identical underlying JS `Map` object.
* `(nset key=value...)`
  * Synopsis: Sets one or more key/value pairs in the Map object using named parameters. Returns the Map object.
* `(set key to=value)`\
`(= key value)`
  * Synopsis: Sets the `value` for the `key` in the Map object. Returns the Map object.
* `(size)`
  * Synopsis: Returns the number of key/value pairs in the Map.
* `(toList)`
  * Synopsis: Returns a new `@list` object (NANOS instance) wrapping the Map.
* `(values)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Map object in insertion order.