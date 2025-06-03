# Mesgjs @string And @regex Interfaces

# Mesgjs @string Interface

* (@init string)   
  * Synopsis: Instance initializer  
  * RIC values: none  
* (@jsv)  
  * Synopsis: Returns the underlying JavaScript string.  
* (at index)  
  * Synopsis: Returns a new string consisting of the UTF-16 code unit at the specified index, or @u.  
  * RIC values: none  
  * A negative index is interpreted relative to the end of the string (i.e., length \+ index).  
  * Returns @u if the index cannot be found.  
* (charAt index)  
  * Synopsis: Returns a new string consisting of the UTF-16 code unit at the specified index, or an empty string.  
  * RIC values: none  
  * Returns an empty string if the index cannot be found (or is negative).  
* (charCodeAt index) \-   
* (codePointAt index) \-   
* (endsWith string) \-   
* (eq string) \-   
* (escRE)  
  * Synopsis: Returns a new string consisting of the base string escaped to use as a literal value in a regular expression.  
  * Based on JS RegExp.escape.  
* (ge string) \-   
* (gt string) \-   
* (includes string)  
  * Synopsis: Returns true if the base string includes (contains) string.  
  * RIC values: none  
* (indexOf string) \-   
* (isWellFormed) \-   
* (join string… with=separator)  
  * Synopsis: Returns a new string consisting of the base string joined (concatenated) with any additional strings, optionally separated by the with= value.  
  * RIC values: none  
  * The additional "strings" may be any objects that accept a (toString) message.  
* (joining string…)  
  * Synopsis: Returns a new string consisting of the optional strings joined (concatenated) together, using the base string as the separator.  
  * RIC values: none  
  * The "strings" may be any objects that accept a (toString) message.  
* (lastIndexOf string) \-   
* (le string) \-   
* (length)  
  * Synopsis: Returns the length of the base string.  
* (lt string) \-   
* (ne string) \-   
* (normalize) \-   
* (padEnd length string) \-   
* (padStart length string) \-   
* (regex flags)  
  * Synopsis: Returns an @regex instance based on the string and optional flags.  
  * RIC values: none  
  * Equivalent to @c(get @regex init=\[string flags\]), but more convenient.  
* (repeat count)  
  * Synopsis: Return a new string composed of the original string repeated count times.  
  * RIC values: none  
* (replace pattern replacement) \-   
* (replaceAll pattern replacement) \-   
* (slice start end) \-   
* (split separator limit) \-   
* (startsWith string) \-   
* (toLower) \-   
* (toString) \-   
* (toUpper) \-   
* (trim)  
  * Synopsis: Returns a copy of the original string with any leading and/or trailing whitespace removed.  
* (trimEnd)  
  * Synopsis: Returns a copy of the original string with any trailing whitespace removed.  
* (trimStart)  
  * Synopsis: Returns a copy of the original string with any leading whitespace removed.  
* (valueOf) \- 

Note that while the regex-optional (split) and modified-string-result (replace) and (replaceAll) operations are part of the @string interface (like their JavaScript equivalents), the regex-specific operations (match1) (equivalent to JS .match), (matchAll), and (search) are regex-based (rather than string-based) operations in Mesgjs, and hence part of the @regex interface.

# Mesgjs @regex Interface

Regular expressions (regexs) are used for pattern-matching operations on strings.

* (@init source flags)  
  * Synopsis: Instance initializer. The source may be either a string (used to generate a new JS RegExp instance in conjunction with the optional flags) or an existing JS RegExp instance.  
  * RIC values: none  
* (@jsv)  
  * Synopsis: Returns the underlying JavaScript RegExp instance.  
* (exec string)  
  * Synopsis: Executes the regex against string.  
* (flags)  
  * Synopsis: Returns the regex flags.  
* (last)  
  * Synopsis: Returns the regex's "lastIndex" (essentially, where the next match can start).  
* (match)  
  * Synopsis: Returns the current match value during (matchAll).  
* (match1 string)  
  * Synopsis: Matches the regex against string, returning the first match or @n.  
  * RIC values: none  
  * Based on JS string.match(regex).  
* (matchAll string each={ block \!} else={ block \!} collect=@f)  
  * Synopsis: Matches the regex against string.  
  * RIC values: each, else  
  * Based on JS string.matchAll(regex).  
  * The each block is (run) for each match, with the current match available via (match).  
  * If there are no matches, the else block is (run) instead.  
  * If collect is @f, the last executed each or else block value is returned.  
  * If collect is @t, a list of each or else block values is returned.  
  * If you just want a list of all the matches, you can use  
    (matchAll string each={\[ *regex*(match) \]} collect=@t)  
* (next result=value)  
  * Synopsis: Continues with the next match in matchAll, optionally setting or accumulating results.  
  * RIC values: none  
* (num)  
  * Synopsis: Returns the 0-based match iteration number during (matchAll).  
  * Returns \-1 in the else block.  
* (search string)  
  * Synopsis: Returns the index of the first match of the regex in string, or \-1 if not found.  
  * RIC values: none  
* (setLast index)  
  * Synopsis: Sets the regex's "lastIndex" value (where the next match can start).  
  * RIC values: none  
* (source)  
  * Synopsis: Returns the regex source string.  
* (stop result=value)  
  * Synopsis: Stops further match iterations in (matchAll), optionally setting or accumulating results.  
  * RIC values: none  
* (test string)  
  * Synopsis: Returns @t if the regex matches string.  
  * RIC values: none

