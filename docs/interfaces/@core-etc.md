# Mesgjs @core Interface (final, singleton, global @c)

* `(_ value)`  
  * Synopsis: The elusive, (mythical?), "basically parentheses" operation.  
  * RIC values: none  
  * Simply returns value as-is. Cf. the `(run)` message and the `@try` interface.  
  * This is essentially the Mesgjs equivalent of a parenthesized expression in other languages.  
  * Note: As the Mesgjs language and this operation currently stand, it's extremely unlikely that you'll ever need this or see it in practical use.  
* `(and value...)`
  * Synopsis: Returns the logical "and" of a list of zero or more values.  
  * RIC values: all  
  * Returns the first false value if any are JS-false.  
  * Returns the last true value of all are JS-true (default: `@t`).  
* `(case value cmp1 res1 cmp2 res2 ... else=value)`   
  * Synopsis: Returns a result value based on a reference value matching one of several comparison values.  
  * RIC values: all except the first value  
  * Compares the first value to the first value of each subsequent pair (cmp1, cmp2, etc) until an equal value is found.   
  * The value immediately following the equal value is returned (res1 if cmp1 was equal, and so on).  
  * If none of the values compare equal, the else value or `@u` is returned.  
  * Equality is based on an object responding to `(caseEq value)` and returning true, responding to `(eq value)` and returning true, or being JavaScript \===.  
* `(debug dispatch=@f dispatchSource=@f dispatchType=@f)`  
  `(debug stack=0 stackSource=@f stackType=@f)`  
  * Synopsis: Optionally sets, and then returns, the runtime debugging configuration.  
  * RIC values: none  
  * All parameters are optional, and may be combined in a single message.  
  * dispatch enables dispatch/return/exception logging to the console.  
  * dispatchSource enables inclusion of JS file/line/column in dispatch logging.  
  * dispatchType enables inclusion of parameter and return types in dispatch logging.  
  * stack sets the number of Mesgjs stack frames to add to JS stack traces (-1 \= all)  
  * stackSource enables inclusion of JS file/line/column in stack traces  
  * stackType enables inclusion of parameter types in stack traces.  
  * Returns a list with the current settings.  
* `(fcheck feature)`  
  * Synopsis: Returns `@t` (true) if feature is ready, `@f` (false) if feature is not ready, or `@u` (undefined) if feature is unknown or has been rejected due to an unloadable module.  
  * RIC values: none  
* `(fready mid=@mid feature)`  
  * Synopsis: Marks feature ready (if the module id, @mid, is associated with the feature).  
  * RIC values: none  
  * Features depend on the presence of module metadata.  
* `(fwait feature...)`  
  * Synopsis: Returns a @promise instance that waits for the specified feature(s) to be ready. The promise will resolve when all the features are ready, or will reject if any of the features are rejected.  
  * RIC values: none  
  * See @promise(then) for additional information about running code or function blocks after a feature becomes ready.  
  * Features depend on the presence of module metadata.  
* `(get type init=params)`  
  * Synopsis: Returns an object instance of the specified interface type (always returning the same (first) instance for singleton interfaces).  
  * RIC values: none  
  * If the init parameter is present, it's passed to the object's @init handler. This parameter should generally be a list.  
* `(interface name)`  
  * Synopsis: Attempts to return an @interface management object for the named interface.  
  * RIC values: none  
* `(log value...)`  
  * Synopsis: Log values to the console  
  * RIC values: none  
* `(logInterfaces)`  
  * Synopsis: Log the raw interface configuration data to the console  
* `(not value)`  
  * Synopsis: Returns the logical "not" of its parameter.  
  * RIC values: value  
  * Returns `@t` if the value is JS-false, or `@f` if the value is JS-true.  
* `(or value...)`
  * Synopsis: Returns the logical "or" of zero or more values.  
  * RIC values: all  
  * Returns the first true value if any are JS-true.  
  * Returns the last false value if all are JS-false (default: `@f`).  
* `(qjson string)`  
  * Synopsis: Creates (possibly-nested) lists from relaxed, quasi-JSON string (accepts JSON and more).  
  * RIC values: none  
  * Allows double-quoted or unquoted keys/values; bigints; ":" or "\=" between keys and values; commas are optional when whitespace is present.  
* `(run value... collect=@f)`  
  * Synopsis: Sends (run) to each value that is a (run)\-able code block  
  * RIC values: all  
  * Returns a list of all of the return values if collect is supplied and JS-true (default is `@f`), otherwise returns the last value.  
* `(slid string)`  
  * Synopsis: Creates (possibly-nested) lists from SLID-format string.  
  * RIC values: none  
* `(type object)`  
  * Synopsis: Returns the Mesgjs type of object.   
  * RIC values: none  
* `(typeAccepts type operation)`  
  * Synopsis: Returns information about operations an interface-type accepts.   
  * RIC values: none  
  * With two parameters, it returns whether a type responds, either directly or indirectly, via a specific or default handler, to a specific message operation.  
  * With one parameter, it returns a list of directly-supported message operations (unless the interface is private, in which case it returns `@u`).  
* `(typeChains type1 type2)`  
  * Synopsis: Returns information about whether a non-private interface-type chains another interface-type.  
  * RIC values: none  
  * With two parameters, it returns whether the second type is ever chained by the first type, either **directly or indirectly** (i.e. if the second type exists in the first interface's flat-chain).  
  * With one parameter, it returns the unexpanded list of types **directly** chained by the first interface-type.  
  * Returns `@u` for private interfaces.  
* `(xor value...)`  
  * Synopsis: Returns the logical "xor" of a list of zero or more values.  
  * RIC values: all  
  * Returns *the* true value if exactly one is JS-true, otherwise returns `@f`.  
  * Evaluation stops if/as soon as more than one value is found to be JS-true.

This interface is always configured as the first external runtime core extension.

# Miscellaneous Interfaces

## `@boolean` (abstract)

* Reserved for future use

## `@false` (final, singleton)

* Chains `@boolean`
* `(toString)` \- Returns text string '@f'  
* `(valueOf)` \- Returns value `@f`

## `@null` (final, singleton)

* `(has)` \- Returns value `@u`  
* `(toString)` \- Returns text string '@n'  
* `(valueOf)` \- Returns value `@n`

## `@true` (final, singleton)

* Chains `@boolean`  
* `(toString)` \- Returns text string '@t'   
* `(valueOf)` \- Returns value `@t`

## `@undefined` (final, singleton)

* `(has)` \- Returns value `@u`  
* `(toString)` \- Returns text string '@u'  
* `(valueOf)` \- Returns value `@u`
