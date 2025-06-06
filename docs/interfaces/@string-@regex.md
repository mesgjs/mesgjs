# Mesgjs `@string` And `@regex` Interfaces

# Mesgjs `@string` Interface

No RIC (run-if-code) values are used in this interface.

* `(@init string)`
  * Synopsis: Instance initializer
* `(@jsv)`
  * Synopsis: Returns the underlying JavaScript string.
* `(at index)`
  * Synopsis: Returns a new string consisting of the UTF-16 code unit at the specified index, or `@u`.
  * A negative index is interpreted relative to the end of the string (i.e., length \+ index).
  * Returns `@u` (undefined) if the index cannot be found.
* `(charAt index)`
  * Synopsis: Returns a new string consisting of the UTF-16 code unit at the specified index, or an empty string.
  * Returns an empty string if the index cannot be found (or is negative).
* `(charCodeAt index)`
  * Synopsis: Returns an integer between 0 and 65535 representing the UTF-16 code unit at the given index.
* `(codePointAt index)`
  * Synopsis: Returns a non-negative integer that is the Unicode code point of the character starting at the given index (counting UTF-16 code units, not Unicode code points).
* `(endsWith string)`
  * Synopsis: Returns `@t` (true) if the receiver ends with `string`, or `@f` (false) otherwise.
* `(eq string)`
  * Synopsis: Returns `@t` (true) if the strings are equal, or `@f` (false) otherwise.
* `(escRE)`
  * Synopsis: Returns a new string consisting of the receiver string escaped to use as a literal value in a regular expression.
  * Based on JS RegExp.escape.
* `(ge string)`
  * Synopsis: Returns `@t` (true) if the receiver is greater than or equal to `string`, or `@f` (false) otherwise.
* `(gt string)`
  * Synopsis: Returns `@t` (true) if the receiver is greater than `string`, or `@f` (false) otherwise.
* `(includes string)`
  * Synopsis: Returns `@t` (true) if the receiver string includes (contains) `string`, or `@f` (false) otherwise.
* `(indexOf string optPosition)`
  * Synopsis: Returns the 0-based index of `string` within the receiver,
  beginning at `optPosition` (default 0), or `-1` if not found.
* `(isWellFormed)`
  * Synopsis: Returns `@f` (false) if the receiver contains any lone surrogates,
  of `@t` (true) otherwise.
* `(join string... with=separator)`\
`(+ string... with=separator)`
  * Synopsis: Returns a new string consisting of the receiver string joined (concatenated) with any additional strings, optionally separated by the `with=` value.
  * The additional "strings" may be any objects that accept a (toString) message.
* `(joining string...)`\
`(- string...)`
  * Synopsis: Returns a new string consisting of the optional strings joined (concatenated) together, using the receiver string as the separator.
  * The "strings" may be any objects that accept a (toString) message.
* `(lastIndexOf string optPosition)`
  * Synopsis: Returns the last 0-based index of `string` within the receiver
  having an index less than or equal to the optional `optPosition`, or `-1`
  if not found.
* `(le string)`
  * Synopsis: Returns `@t` (true) if the receiver is less than or equal to `string`, or `@f` (false) otherwise.
* `(length)`
  * Synopsis: Returns the length of the receiver string.
* `(lt string)`
  * Synopsis: Returns `@t` (true) if the receiver is less than `string`, or `@f` (false) otherwise.
* `(ne string)`
  * Synopsis: Returns `@t` (true) if the strings are not equal, or `@f` (false) otherwise.
* `(normalize)`
  * Synopsis: Returns the Unicode Normalization Form of the receiver.
* `(padEnd length string)`
  * Synopsis: Returns a copy of the receiver, padded to the specified `length`
  by appending `string` as needed.
* `(padStart length string)`
  * Synopsis: Returns a copy of the receiver, padded to the specified `length`
  by inserting `string` as needed.
* `(re flags)`
  * Synopsis: Returns an `@regex` instance based on the string and optional flags.
  * This is the preferred equivalent of `@c(get @regex init=[`_`receiver`_ `flags])`.
* `(repeat count)`
  * Synopsis: Returns a new string composed of the original string repeated count times.
* (replace pattern replacement) \-
* (replaceAll pattern replacement) \-
* `(slice start end)`
  * Synopsis: Returns a new string containing a substring of the receiver
  beginning at the optional `start` position (default: 0) and ending
  _before_ the optional `end` position (default: end-of-string).
  * Either or both of `start` and `end` may be negative, in which case they
  are interpreted relative to the end of the string.
* (split separator limit) \-
* `(startsWith string)`
  * Synopsis: Returns `@t` (true) if the receiver starts with `string`, or `@f` (false) otherwise.
* `(substring a b)`
  * Synopsis: Like `(slice a b)` (for `a <= b`) or `(slice b a)` (for `b < a`)
  * Negative indexes are treated as `0` rather than relative to the end of
  the string.
  * This behavior is straight from the JavaScript `.substring()` implementation.
* `(toLower)`
  * Synopsis: Returns an all-lower-case version of the string.
* `(toString)`
  * Synopsis: Returns the underlying JavaScript string.
* `(toUpper)`
  * Synopsis: Returns an all-upper-case version of the string.
* `(trim)`
  * Synopsis: Returns a copy of the original string with any leading and/or trailing whitespace removed.
* `(trimEnd)`
  * Synopsis: Returns a copy of the original string with any trailing whitespace removed.
* `(trimStart)`
  * Synopsis: Returns a copy of the original string with any leading whitespace removed.
* `(valueOf)`
  * Synopsis: Returns the underlying JavaScript string.

Note that while the regex-optional `(split)` and modified-string-result
`(replace)` and `(replaceAll)` operations are part of the `@string`
interface (like their JavaScript equivalents), the regex-specific
operations `(match1)` (equivalent to JS `.match`), `(matchAll)`, and
`(search)` are regex-based (rather than string-based) operations in
Mesgjs, and hence part of the `@regex` interface.

# Mesgjs `@regex` Interface

Regular expressions (regexs) are used for pattern-matching operations on strings.

RIC values are rarely used in this interface; assume no values are RIC
values except where otherwise indicated.

* `(@init source flags)`
  * Synopsis: Instance initializer. The source may be either a string (used to generate a new JS `RegExp` instance in conjunction with the optional flags) or an existing JS `RegExp` instance.
* `(@jsv)`
  * Synopsis: Returns the underlying JavaScript `RegExp` instance.
* `(exec string)`
  * Synopsis: Executes the regex against string.
* `(flags)`
  * Synopsis: Returns the regex flags.
* `(last)`
  * Synopsis: Returns the regex's "lastIndex" (essentially, where the next match can start).
* `(match)`
  * Synopsis: Returns the current match value during `(matchAll)`.
* `(match1 string)`
  * Synopsis: Matches the regex against string, returning the first match or `@n` (null).
  * Based on JS `string.match(regex)`.
* `(matchAll string each={ block !} else={ block !} collect=@f)`
  * Synopsis: Matches the regex against string.
  * RIC values: `each`, `else`
  * Based on JS `string.matchAll(regex)`.
  * The `each` block is `(run)` for each match, with the current match available via `(match)`.
  * If there are no matches, the `else` block is `(run)` instead.
  * If collect is `@f`, the last executed `each` or `else` block value is returned.
  * If collect is `@t`, a list of `each` or `else` block values is returned.
  * If you just want a list of all the matches, you can use
    `(matchAll string each={[` _`regex`_`(match) ]} collect=@t)`
* `(next result=value)`
  * Synopsis: Continues with the next match in `matchAll`, optionally setting or accumulating results.
* `(num)`
  * Synopsis: Returns the 0-based match iteration number during `(matchAll)`.
  * Returns `-1` in the else block.
* `(search string)`
  * Synopsis: Returns the index of the first match of the regex in string, or `-1` if not found.
* `(setLast index)`
  * Synopsis: Sets the regex's "lastIndex" value (where the next match can start).
* `(source)`
  * Synopsis: Returns the regex source string.
* `(stop result=value)`
  * Synopsis: Stops further match iterations in `(matchAll)`, optionally setting or accumulating results.
* `(test string)`
  * Synopsis: Returns `@t` if the regex matches `string`, or `@f` (false) otherwise.

