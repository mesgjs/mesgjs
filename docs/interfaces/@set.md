# Mesgjs `@set` Interface

This is the interface for Mesgjs objects that wrap JavaScript `Set` instances.

* `(@init set)`
  * Synopsis: Create a new set, optionally providing a JavaScript `Set` object to wrap.
* `(add value)`
  * Synopsis: Appends `value` to the Set object.
* `(clear)`
  * Synopsis: Removes all elements from the Set object.  
* `(delete value)`
  * Synopsis: Removes the specified element from the Set object. Returns `@t` if an element was removed, or `@f` otherwise.
* `(entries)`
  * Synopsis: Returns a new `@list` object that contains an array of `[value, value]` for each element in the Set object, in insertion order.  
* `(has value)`
  * Synopsis: Returns `@t` if an element with the specified value exists in the Set object; otherwise `@f`.
* `(keys)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Set object in insertion order. (This is an alias for `(values)`).
* `(values)`
  * Synopsis: Returns a new `@list` that contains the values for each element in the Set object in insertion order.
* `(size)`
  * Synopsis: Returns the number of values in the Set.