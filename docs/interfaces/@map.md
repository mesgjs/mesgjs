# Mesgjs `@map` Interface

This is the interface for Mesgjs objects that wrap JavaScript `Map` instances.

* `(@init map)`
  * Synopsis: Create a new map, optionally providing a JavaScript `Map` object to wrap.
* `(clear)`
  * Synopsis: Removes all elements from the Map object.  
* `(delete key)`
  * Synopsis: Removes the specified element from the Map object by key. Returns `@t` if an element was removed, or `@f` otherwise.
* `(entries)`
  * Synopsis: Returns a new `@list` object that contains an array of `[key, value]` for each element in the Map object, in insertion order.  
* `(get key)`
  * Synopsis: Returns the value associated with the `key`, or `@u` (undefined) if there is none.
* `(has key)`
  * Synopsis: Returns `@t` if an element with the specified key exists in the Map object; otherwise `@f`.
* `(keys)`
  * Synopsis: Returns a new `@list` that contains the keys for each element in the Map object in insertion order.
* `(set key value)`
  * Synopsis: Sets the `value` for the `key` in the Map object.
* `(values)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Map object in insertion order.
* `(size)`
  * Synopsis: Returns the number of key/value pairs in the Map.