# Mesgjs "Words" Specification

In addition to single- and double-quoted "string" (text) literals,
Mesgjs has a concept of unquoted string literals, called "words".
"Words" come in two "flavors":

* "Operator"-style words
* "Regular"-style words

Operator-style words may contain the following special characters:\
``~ ` ! @ # $ % ^ & * + - = | . , < > / ?``

Regular-style words may contain a smaller set of special characters
in addition to regular characters:\
``~ ` @ $ ^ & * + - | . , < > / ?``\
(but not any of these: ``! # % =``).

There are a couple of rules:

* The `( ) [ ] { } !} // /*` character sequences (for messages, lists, blocks,
single-line comments, and multi-line comments) always terminate either
type of word.
* While operator-style words may *contain* `@` and `:`, they may not
*start* with them. Words starting with either of those characters will
be treated as regular words. Words starting with any of the other special
characters will be treated as operator-style words.
* Other words will be treated as regular-style words.
* Namespace/scope and key/value association characters `!`, `#`, `%`, and
`=` terminate regular-style words.
* Namespace/scope characters `!`, `#`, or `%` after `=` terminate
operator-style words.
* Numeric literals (numbers) may appear within regular-style words
(causing them to actually be word literals rather than numeric literals),
but they may not appear within operator-style words.
* If a number with a leading `+` or `-` follows an operator literal,
the sign is associated with the number, not the operator literal.

# Language-Level Special Operator Words

The following are interpreted and implemented directly as part of the
language, not through interface handlers.

* `=` - key/value association (**NOT** assignment!)
* `%` and `%?` - object persistent property storage
* `#` and `#?` - transient/scratch storage, per dispatch
* `!` and `!?` - message parameters
* `%*` and `%*?` - global shared storage
* `%/` and `%/?` - module private/persistent storage

Notes:

* The `=` association operator only creates an association between key/value
pairs in list literals or the message-parameters portion of messages.
Otherwise, it has no special meaning.
* Storage operator words only have storage effects when used
for value retrieval (i.e. when followed by a named or index/positional key)
or as the base object for a message (otherwise they have no special meaning).
* The storage operator words with the trailing `?` just indicate that `@u`
(undefined) should be returned for unset values instead of throwing an error.

# Examples

* `@c @d :label`
  * Each of these three words is a regular-style word (`@` and `:` may
  appear in an operator-style word, but cannot start one).
* `thx-1138` is also a *regular*-style word (it contains a special
character, but doesn't start with one and doesn't contain any
*terminating* special characters).
* `<=>` is a single operator-style word (`=` does not terminate an
operator-style word unless followed by `!`, `#`, or `%`).
* `x#y` is the same as `x # y`
  * This results in two separate values: the regular word "x" and a reference
  to object persistent property "y". (`#` terminates regular word `x`.)
  * (While perfectly valid, the lack of white space is not recommended.)
* `x=#y` is the same as `x = # y`
  * This represents key "x" associated with persistent property "y".
  (`=` terminates regular word `x`; `#` terminates operator word `=`.)
* `!-1` means `! -1` (the last positional message parameter)
  * `!` is an operator-style word. Since it is immediately followed by a
  number, and without white space to disambiguate, the `-` sign goes with
  the number.
  * `-1` is a numeric literal (number).
* `#x(!=y else=@u)` means `# x ( != x else = @u )`
  * The message delimiters `(` and `)` terminate regular words `x` and `@u`.
  * `#` is an operator word (which, being followed by a value, will be used
  to reference scratch (transient) storage).
  * `x` is a regular word.
  * `!=` is an operator word (the operation for the message).
  * `else` is a regular word.
  * `=` is an operator word (which, appearing between two values in a
  (message parameter) list, will create a key-value association between
  `else` and `@u`).
  * `@u` is another regular word.
* `#(nset x=y=2)` means `#(nset x = y 0 = '=' 1 = 2)`
  * The first `=` is between a key/value pair, and results in a key/value
  association.
  * The second `=`, by its placement, is **not** between a new key/value pair,
  so it is equivalent to a quoted string (no special meaning). In this case,
  it's the first positional parameter (key `0`).
  * The `2` is also not part of a key/value pair, so it is the second
  position parameter (key `1`).
  * For those familiar with JavaScript, this would be roughly equivalent to:\
  ` { x: y, 0: '=', 1: 2 }`
