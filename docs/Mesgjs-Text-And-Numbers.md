# Mesgjs Text Strings And Numbers

# Numbers

Numbers consist of the following parts:

* An optional `+` or `-` sign
* An optional radix (base) indicator:
  * `0b` or `0B` - binary (base 2)
  * `0o` or `0O` - octal (base 8)
  * `0x` or `0X` - hexadecimal (base 16)
* One or more "digits" in the base (including upper- or lower-case A through F
for base 16) representing the integer portion of the number
* A lower-case 'n' if the number should be a JavaScript "bigint"
* An optional decimal point followed by one or more digits
* An optional exponent consisting of:
  * The letter `e` or `E`
  * An optional `+` or `-` sign for the exponent
  * One or more digits

Except in the specific cases mentioned, numeric literals may not include
letters.

*If a number is immediately followed by letters, it will be
processed as a word instead of a number.*

# Text Strings

Mesgjs supports four different forms of text strings:

* Text between pairs of 'single-quotes' (escape sequences supported)
* Text between pairs of "double-quotes" (escape sequences supported)
* Operator-style words
* Regular-style words

## Operator-Style Words

Operator-style words ("op-words") may consist of one or more of
the special characters from the *Allowed* group:

| | |
| --- | --- |
| Allowed: | ``~ ` ! @ # $ % ^ & * + - = \| . : , ; < > ? /`` |
| Prohibited: | `( ) [ ] { } ' "` |

Op-words will not include adjacent special characters that are:

* The start of comments (`//` or `/*`)\
Example: `@c(?/* "if" alias */) // op-word is just "?"`
* Returning-block tokens (`!}`)\
`{---!}` is equivalent to `{ --- !}`
* `+` or `-` that are parts of numbers (i.e. followed by a digit)\
`3(!=-5)` is equivalent to `3(!= -5)`

In order for the key/value association operator `=` to work
in a reasonable way in the absence of white-space, an op-word beginning
with a lone `=` will not include:

* Adjacent storage-operators (`!`, `#`, or `%`)\
`#(nset x=!x)` means `#(nset x = ! x)`
* Special-use markers for regular-style words (`@` or `:`)\
`#(nset done=@f)` means `#(nset done = @f)`
* `+` or `-` that are parts of numbers (i.e. followed by a digit)\
`#(nset x=-5)` means `#(nset x = -5)`

Since regular-style words may begin with the special-use markers
`@` or `:`, op-words may *contain them, but not start with them.*

## Regular Words

Regular-style words ("words") are something of a
"catch-all" for everything that is not specifically something else in
Mesgjs.

They can actually *contain* most of the special characters that can
appear in op-words, but they cannot *start* with a special character
other than one of the two special-use markers `@` or `:`. Specifically:

| | |
| --- | --- |
| Allowed: | `` ` ~ @ $ ^ & * + - \| . : , ; < > ? /`` |
| Prohibited: | `! # % = ( ) [ ] { } ' "` |

Note that `! # % =` sometimes allowed in op-words are always prohibited
within regular words.

"Words" may contain both digits and alphabetic characters. They can start
with digits (if the digits are followed by letters and don't qualify as actual
numbers). They can contain `+` or `-`, but not start with either.

Like op-words, regular words terminate at the start of a comment
(`//` or `/*`). Other than that, `/` is allowed as a non-initial character.

Examples:

```
THX-1138 404NOTFOUND and/or
```

Counter-Examples:

```
404-NOTFOUND // 404 is a number; - is an op-word; NOTFOUND is a word
```

# Quoted-String Escape Sequences

- `\b` \- backspace
- `\n` \- newline
- `\r` \- carriage return
- `\t` \- horizontal tab
- `\u`_`HHHH`_ \- character codes up to 16 bits as four hexadecimal digits
- `\x`_`HH`_ \- character codes up to 8 bits as two hexadecimal digits
- `\'` \- single quote
- `\"` \- double quote
- `\\` \- backslash


# Language-Level Special Operator-Words

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
* Storage op-words only have storage effects when used for value retrieval
(i.e. when followed by a named or index/positional key) or as the base object
for a message. Otherwise they have no special meaning.
* The storage op-words with the trailing `?` just indicate that `@u`
(undefined) should be returned for unset values instead of throwing an error.

# More Examples

* `@c @d :label`
  * Each of these three words is a regular-style word (`@` and `:` may
  appear in an op-word, but cannot start one).
* `thx-1138` is also a *regular*-style word (it contains a special
character, but doesn't start with one and doesn't contain any
*terminating* special characters).
* `<=`, `<=>`, and `=>` are all single op-words (even when `=` is the first
character, it is not followed by a storage operator or the sign portion of a
number)
* `x#y` is the same as `x # y`
  * This results in two separate values: the regular word "x" and a reference
  to scratch value "y". (`#` terminates regular word `x`.)
  * (While perfectly valid, the lack of white space is not recommended.)
* `x=#y` is the same as `x = # y`
  * This represents key "x" associated with scratch value "y".
  (`=` terminates regular word `x`; storage operator `#` terminates op-word `=`.)
* `!-1` means `! -1` (the last positional message parameter)
  * `!` is an operator-style word. Since it is immediately followed by a
  number, and without white space to disambiguate, the `-` sign goes with
  the number.
  * `-1` is a numeric literal (number).
* `#x(!=y else=@u)` means `# x ( != x else = @u )`
  * The message delimiters `(` and `)` terminate regular words `x` and `@u`.
  * `#` is a storage op-word (which, being followed by a value, will be used
  to reference scratch (transient) storage).
  * `x` is a regular word.
  * `!=` is an op-word (the operation for the message).
  * `else` is a regular word.
  * `=` is an op-word (which, appearing between two values in a
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
