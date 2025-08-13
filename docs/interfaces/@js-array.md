# Mesgjs `@js-array` Interface

This interface provides a bridge to native JavaScript `Array` objects, allowing them to be messaged directly within Mesgjs. It is automatically applied to any JavaScript `Array` when it is converted to a Mesgjs object.

This interface mirrors much of the functionality of the JavaScript `Array.prototype`.

* `(@init array)`
  * Synopsis: Initializes the Mesgjs object with a given JavaScript `array`.
* `(@jsv)`
  * Synopsis: Returns the underlying native JavaScript `Array` object.
* `(at index)` / `(@ index)` / `(get index)`
  * Synopsis: Returns the value at the specified numeric `index`.
* `(concat list)`
  * Synopsis: Returns a new array containing the elements of the current array joined with the elements of `list`. Mirrors `Array.prototype.concat()`.
* `(entries)`
  * Synopsis: Returns a new JS array containing the key/value pairs for each index in the array. Mirrors `Array.prototype.entries()`.
* `(flat depth=1)`
  * Synopsis: Returns a new array with all sub-array elements concatenated into it recursively up to the specified `depth`. Mirrors `Array.prototype.flat()`.
* `(keys)`
  * Synopsis: Returns a new JS array containing the keys for each index in the array. Mirrors `Array.prototype.keys()`.
* `(keyIter)`
  * Synopsis: A low-level function that returns the JavaScript key-iterator function used by the `@kvIter` interface.
* `(length)` / `(size)`
  * Synopsis: Returns the number of elements in the array.
* `(pop)`
  * Synopsis: Removes and returns the last element of the array. Modifies the array in place. Mirrors `Array.prototype.pop()`.
* `(push value...)`
  * Synopsis: Adds one or more values to the end of the array. Modifies the array in place. Mirrors `Array.prototype.push()`.
* `(reverse)`
  * Synopsis: Reverses the order of the elements of an array in place. Returns the reversed array. Mirrors `Array.prototype.reverse()`.
* `(set index to=value)` / `(= index to=value)`
  * Synopsis: Sets the array element at `index` to the given `value`. Modifies the array in place.
* `(setLength newLength)`
  * Synopsis: Sets the length of the array.
* `(shift)`
  * Synopsis: Removes and returns the first element of the array. Modifies the array in place. Mirrors `Array.prototype.shift()`.
* `(slice start end)`
  * Synopsis: Returns a shallow copy of a portion of an array into a new array object. Mirrors `Array.prototype.slice()`.
* `(sort compareFn)`
  * Synopsis: Sorts the elements of an array in place. The optional `compareFn` specifies a function that defines the sort order. Mirrors `Array.prototype.sort()`.
* `(toList)`
  * Synopsis: Returns a new Mesgjs `@list` (a `NANOS` object) containing the entries of the array.
* `(toReversed)`
  * Synopsis: Returns a new array with the elements in reversed order, without modifying the original array. Mirrors `Array.prototype.toReversed()`.
* `(toSorted compareFn)`
  * Synopsis: Returns a new array with the elements sorted in ascending order, without modifying the original array. Mirrors `Array.prototype.toSorted()`.
* `(unshift value...)`
  * Synopsis: Adds one or more values to the beginning of the array. Modifies the array in place. Mirrors `Array.prototype.unshift()`.