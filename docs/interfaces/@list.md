# Mesgjs `@list` Interface

This is the interface implemented by storage namespaces (`%`, `#`, `!`, `%*`/`@gss`, `%/`/`@mps`) and lists.

* `(@init list)`
  * Synopsis: Create a new list, optionally providing the JavaScript `NANOS` object list.  
* `(at key... path=[key...] else=elseBlock)`\
`(get key... path=[key...] else=elseBlock)`\
`(@ key... path=[key...] else=elseBlock)`
  * Synopsis: Return the value at the end of the key path (positional or path), if the value is present.  
  * RIC values: elseBlock  
  * The path option, if present, takes precedence over any positional key path.  
  * If there is no value stored at the specified key path and the `else=` parameter is provided, the elseBlock is (run) and its value is returned instead.  
  * If there is no value stored at the specified key path and the `else=` parameter is not provided, a `ReferenceError` is thrown.  
  * An `(at)` key path will traverse `Array` (`@jsArray`), `Map` (`@map`), `NANOS` (`@list`), plain `Object` (`@jsObject`), and `Set` (`@set`) instances.
* `(clear)`
  * Synopsis: Clears the list, removing all contents.  
* `(copy)`
  * Synopsis: Returns a shallow copy of the list.  
* `(delete key)`
  * Synopsis: Deletes the key/value at the specified key, returning the deleted value (or `@u` if not present).  
* `(depend)`
  * Synopsis: Generates a reactive dependency on changes to the list.  
  * Does nothing if reactive mode has not been enabled (see `(rio)`).  
  * Reactive consumers will be notified whenever otherwise non-reactive values (including the key list) change.  
* `(entries compact)`
  * Synopsis: Returns a list of `[ key value ]` lists representing the items in the list.
  * `[ [ key1 value1 ] [ key2 value2 ] ... [ keyN valueN ] ]`
  * If compact is `@t`, index keys are numeric instead of strings. The default is `@f`.
* `(eq to)`\
  `(@eq to)`
  * Synopsis: Returns `@t` if `to` refers to the identical underlying `NANOS` object (boxed or unboxed).
* `(getter key else=elseBlock)`
  * Synopsis: Returns a `(run)`\-able "getter" code block for key.  
  * RIC values: `elseBlock`  
  * Equivalent to `{` _`receiver`_`(at` _`key`_ `else=`_`elseBlock`_`) !}`, but marginally more efficient.  
  * The getter will throw an error when `(run)` if the key is not set and else is not supplied.  
* `(has key)`
  * Synopsis: Returns `@t` if the list includes the specified key, or `@f` otherwise.  
* `(includes value)`
  * Synopsis: Returns `@t` if the list includes the specified value, or `@f` otherwise.  
* `(indexEntries compact)`
  * Synopsis: Like `(entries)`, except that it only returns entries with index (positional) keys.  
  * If compact is `@t`, keys are numeric instead of strings. The default is `@f`.  
* `(indexKeys)`
  * Synopsis: Like `(keys)`, except that it only returns index (positional) keys.  
* `(isLocked key)`
  * Synopsis: Returns whether a specific key or the entire key-set is locked.  
  * If the optional key is supplied, returns `@t` if the **value** associated with key is locked, or `@f` otherwise.  
  * If the optional key is undefined or not supplied, returns `@t` if the entire **key-set** is locked, or `@f` otherwise.  
* `(isRedacted key)`
  * Synopsis: Returns `@t` if the key/value for the specified key are marked redacted, or `@f` otherwise.  
* `(keyOf value)`
  * Synopsis: Returns the first key in the list having value value, or `@u` if the value is not found.  
* `(keyIter)`
  * Synopsis: Returns a JS key-iterator function used by the `@kvIter` interface.  
* `(keys)`
  * Synopsis: Returns a list of all the keys (index and named) in order.  
  * See `(set)` for additional details.  
* `(lastKeyOf value)`
  * Synopsis: Returns the last key in the list having value value, or `@u` if the value is not found.  
* `(lock key...)`
  * Synopsis: Locks the **values** of the specified key(s). It does not prevent the addition or removal of other keys.  
* `(lockAll andNew)`
  * Synopsis: Locks all current **values**, and future values as well if `andNew` is present and true.  
* `(lockKeys)`
  * Synopsis: Locks the **key-set** for the list (preventing the addition or removal of keys). It does not affect values.  
* `(namedEntries)`
  * Synopsis: Like `(entries)`, except that it only returns entries with named keys.  
* `(namedKeys)`
  * Synopsis: Like `(keys)`, except that it only returns named keys (no index keys).  
* `(ne to)`
  * Synopsis: Returns `@t` if `to` does not refer to the identical underlying `NANOS` object.
* `(next index)`
  * Synopsis: Sets the next index if the optional index is supplied, otherwise returns the current next index..
  * In the setting mode, it returns the list object for chaining.
  * Existing index items with an index greater than or equal to the new index will be removed from the list.
* `(nset key1=value1 ... keyN=valueN)`\
`(== key1=value1 ... keyN=valueN)`
  * Synopsis: "Named" set/multiple set. Equivalent to `(set key to=value)` repeated for each key/value pair.  
  * Named set only works for top-level keys (there are no key paths).  
  * **IMPORTANT:** `key1=value1`, etc. *are NOT assignments* - they're key/value message parameters\! The actual assignments (to storage) are performed within the `(nset)` message handler, which does not execute until after all of the parameters are evaluated. Of particular consequence is that subsequent key-value pairs cannot depend on earlier key-value pairs within the same `(nset)`.\
    `#(nset a=1 b=#a(mul 2)) // Error! #a is not yet set when computing the value for key b`\
    `#(nset a=1) #(nset b=#a(mul 2)) // OK - #a is set before the second (nset) message`
  * Keep in mind that positional values ("without keys") have implied, consecutive index keys, and these will be set too\!  
    `(nset x=5 well hello) // means nset(x=5 0=well 1=hello)`
* `(options)`
  * Synopsis: Gets the underlying NANOS options. See the [NANOS documentation](https://github.com/mesgjs/nanos) for details.
* `(pairs compact)`
  * Synopsis: Similar to `(entries)`, but flattened into a single list of key/value pairs.
  * `[ key1 value1 key2 value2 ... keyN valueN ]`
* `(pop)`\
`(>)`
  * Synopsis: Removes and returns the value at index `(next) - 1`.
  * Returns `@u` if `(next)` is 0 or there is no value at that index.  
  * If `(next)` is not zero, it is reduced by one.  
* `(push value...)`\
`(|+ value...)`
  * Synopsis: Adds value(s) onto the end of the list.
  * When pushing a list, the list itself is added as a single item.
  * Indexed items are added, preserving gaps, beginning at `(next)`.
* `(pushx value...)`\
`(|* value...)`
  * Synopsis: Adds value(s) onto the end of the list, expanding list, @map, and @set arguments to their elements.
  * When pushing a list, its individual elements are added instead of the list itself.
  * Useful for merging lists: `list1(pushx list2)` adds all elements from list2 to list1.
* `(redact key...)`
  * Synopsis: Marks the key/value pairs for the specified keys (or the entire list) to be redacted.  
  * `(redact @t)` will blanket-redact the entire list (including new items).  
  * See `(toString)` for additional details.  
* `(reverse)`
  * Synopsis: Reverses the list in place.  
  * New index \= (next) \- 1 \- old index  
  * If `(next)` is 4, `[ a=1 0=first b=2 1=second c=3 ]`  
    would become `[ c=3 2=second b=2 3=first a=1 ]`  
    (All index keys shown here for clarity; consecutive keys 0, 1, and 3 would normally not be displayed.)
* `(rio object)`
  * Synopsis: Sets the RIO (reactive-interface object) if object is provided, otherwise returns `@t` or `@f` depending on whether or not a RIO is currently configured.  
  * The RIO provides an implementation-agnostic way to support reactive lists. See below.  
  * If object is `@t` (true), a default RIO is assigned using @c(get @reactive)(rio).  
  * If object is `@u` (undefined), `@n` (null), or `@f` (false), any existing RIO is removed.  
* `(rxt)`
  * Synopsis: "Reactive transform" - makes the list fully reactive, recursively.  
  * Automatically assigns a default RIO if one is not already configured (equivalent to `(rio @t)`).  
  * Enables `autoReactive` mode, which automatically wraps stored values in reactive proxies.  
  * Recursively applies the reactive transform to all nested `@list` instances.  
  * This is a convenience method for making an entire list structure (including existing values) reactive in one operation.  
* `(self)`
  * Synopsis: Returns the underlying JS `NANOS` object.  
  * To prevent accidental data leaks, namespace (storage object) references
  only have special meaning as message bases (e.g. as in `%(self)`) or with
  specific keys (e.g. `%x`). Otherwise, they are just word literals, e.g.
  `[ % ]` is equivalent to `[ '%' ]`.
  * If you want to deliberately expose an entire namespace, such as to preserve broad namespace access when creating a `(fn)`, use the `(self)` message.\
  `[ %(self) #(self) !(self) ]`
* `(set key... path=[key...] to=value insert=bool first=value next=value)`\
`(= key... path=[key...] to=value insert=bool first=value next=value)`
  * Synopsis: Sets a value in a list at the end of a key path.  
  * The to option is mutually exclusive of first and next.  
  * The path option, if present, takes precedence over any positional key path.  
  * If `to` is supplied, the value is added using the final key. It is inserted if insert is supplied and true, or appended otherwise.  
    JS analogy: `list[key1][key2]...[keyN] = to;`
  * Inserts occur at the earliest point in the list that preserves ascending index order. (Named keys will always be inserted at the beginning of the list.)
  * Appends occur at the latest point in the list that preserves ascending index order. (Named keys will always be appended at the end of the list.)
  * If `first` is supplied (and `to` is not), its value is inserted as a new index 0 value at the front of a list at the final key value.  
    JS analogy: `list[key1][key2]...[keyN].unshift(first);`
  * If `next` is supplied (and `to` is not), its value is appended at the end of a list at the final key value.  
    JS analogy: `list[key1][key2]...[keyN].push(next);`
  * `insert` has no effect on first and next.  
  * Nested lists are created as necessary along the key path.  
    **IMPORTANT WARNING:**  
    **Beware of the potential to create deeply-nested lists and/or overwrite existing values\!**  
* `(setOpts name=value...)`
  * Synopsis: Sets the underlying NANOS options. See the [NANOS documentation](https://github.com/mesgjs/nanos) for details. Returns the list instance for chaining.
* `(setter key)`
  * Synopsis: Returns a `(call)`\-able "setter" function for key  
  * Equivalent to `{ %0(set %1 to=!0) }(fn` _`receiver key`_`)`
  * Use *setter*(call *value*) to set the original receiver's key to value.  
* `(shift)`\
`(<)`
  * Synopsis: Removes and returns the value at index 0.  
  * Returns `@u` if `(next)` is 0 or there is no value at that index.  
  * If `(next)` is not zero, it is reduced by one and remaining indexes are renumbered (in their current key position) by one (index 1 becomes the new 0, 2 becomes the new 1, etc.).  
* `(slice start end raw?=@f)`
  * Synopsis: Returns a shallow copy of a portion of the list as a new `NANOS` instance.  
  * The slice includes elements from `start` (inclusive) to `end` (exclusive).  
  * If `start` is omitted or `@u`, it defaults to 0.  
  * If `end` is omitted or `@u`, it defaults to `(next)` (the list length).  
  * Negative indices count backward from the end of the list (e.g., -1 refers to the last element).  
  * If the `raw` option is included and is `@t`, raw (potentially reactive) values will be transferred to the slice
  * The returned slice preserves sparseness (gaps in index sequences are maintained).  
  * The original list is not modified.  
  * JS analogy: `Array.prototype.slice()`  
* `(size)`
  * Synopsis: Returns the size of the list (total number of actual index and named keys).  
  * Empty/skipped (sparse) indexes do not contribute to size (but note that empty and `@u` (undefined) are not the same).  
* `(toJSON)`
  * Synopsis: Returns an (ugly) JSON string-encoding of the list. Use of SLID format ((toSLID)) instead is recommended.  
* `(toReversed)`
  * Synopsis: Like (reverse), but operates on, and returns, a shallow copy instead of the original list..  
* `(toSLID)`
  * Synopsis: Returns a SLID-format string-encoding of the *entire (nested) list structure*.  
  * The nested structure can be regenerated from the string by using @c(slid string).  
* `(toString)`
  * Synopsis: Similar to (toSLID), but redacted values will be hidden.  
  * Redacted list: /\*???\*/  
  * Redacted named value: /\*?=?\*/  
  * Redacted index value: /\*?\*/  
* `(unshift value...)`\
`(+| value...)`
  * Synopsis: Inserts value(s), ***from last to first***, at the beginning of the list.
  * When unshifting a list, the list itself is inserted as a single item.
  * Existing index items are renumbered to accommodate newly-inserted index items.
  * (unshift value1 value2 value3) is equivalent to (unshift value3)(unshift value2)(unshift value1)
* `(unshx value...)`\
`(*| value...)`
  * Synopsis: Inserts value(s), ***from last to first***, at the beginning of the list, expanding list, @map, and @set arguments to their elements.
  * When unshifting a list, its individual elements are inserted instead of the list itself.
  * Useful for prepending lists: `list1(unshx list2)` inserts all elements from list2 at the beginning of list1.
  * Existing index items are renumbered to accommodate newly-inserted index items.
* `(values)`
  * Synopsis: Returns a ***non-sparse*** list of ***indexed*** values.

## Push/Unshift Technical Details

The difference between `(push)`/`(unshift)` and `(pushx)`/`(unshx)` relates to how message parameters are processed:

* **`(push)` and `(unshift)`**: Receive the message parameters as a NANOS object (d.mp), which is then expanded one level by the underlying NANOS.push()/unshift() methods. This means:
  * `list(push a b c)` - The parameters a, b, c are in d.mp, which gets expanded, so a, b, c are added individually.
  * `list(push anotherList)` - The parameter anotherList is in d.mp, which gets expanded one level, so anotherList itself is added as a single item.

* **`(pushx)` and `(unshx)`**: Use the expand() helper to extract values from list, @map, and @set parameters before passing them to NANOS.push()/unshift(). This means:
  * `list(pushx a b c)` - Same as push: a, b, c are added individually.
  * `list(pushx anotherList)` - The expand() helper extracts the elements from anotherList, so those elements are added individually, not the list itself.
  * `list(pushx aMap)` - The expand() helper extracts the values from the @map, adding them individually.
  * `list(pushx aSet)` - The expand() helper extracts the values from the @set, adding them individually.

This design allows you to choose whether you want to add a collection as a single item (`push`) or merge its contents (`pushx`).

## Reactive Interface Objects (RIOs)

RIOs allow `@list` instances to implement reactive "bundling" (aggregation of reactive values) in an implementation-independent manner.

A RIO consists of a plain JavaScript object with seven properties:

**Basic (reactive packaging):**

* `batch(callback)` \- A function that calls the callback function in a reactive batch (avoiding as many recalculations as possible until the end of the batch operation) and returns the result.

* `changed()` \- A function to be called when not-directly-reactive state has changed (e.g., when a list key has been added or removed), thus turning non-reactive events into reactive events. The function triggers a change-ripple in the dependency graph.

* `create()` \- A function to create a new reactive and return a new RIO for it (the JS equivalent of Mesgjs `@c(get @reactive)(rio);` used to propagate reactivity to auto-generated nested lists, for example).

* `depend()` \- A function to generate dependency by accessing the RIO's reactive (essentially, a reactive proxy for non-reactive values).

**Extended (reactive values):**

* `get(v)` \- A function that returns the reactive value of `v` (equivalent to `v.rv`).

* `isReactive(v)` \- A function that checks whether `v` is a reactive value.

* `onSet(nanos, key, value)` \- A hook function called when setting values on a NANOS instance. It handles reactive wrapping and chaining based on the `autoReactive` option and whether current/new values are reactive.

`@c(get @reactive)(rio)` will generate a suitable RIO for lists to use `@reactive`\-interface-based reactivity:

```
#(nset rlist=[](rio @c(get @reactive)(rio))) // ... OR just ...  
#(nset rlist=[](rio @t)) // (shortcut for above)
// #rlist and auto-generated nested lists are now reactive
```
