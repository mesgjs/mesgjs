# Mesgjs Syntax

`<shebang>` and `<configSLID>` are recognized and returned at the lexical
analysis stage rather than the parsing stage. They are part of the source
format, but not technically part of the Mesgjs language, _per se_. With that in
mind, source syntax begins with symbol `<SOURCE>`.

```
<SOURCE>     = <shebang>? <configSLID>? <statement>*
<block>      = '{' <statement>* ( '}' | '!}' )
<chain>      = ( <varOptName> | <literal> ) <message>+
<comment>    = ( '//' singleLine ) | ( '/*' multiLine '*/' )
<configSLID> = '[(' multiLine ')]' // SLID-format configuration block
<debug>      = '@debug{' <statements>* '}'
<jsEmbed>    = '@js{' multiLine '@}' // JavaScript content
<list>       = '[' <listItem>* ']'
<listItem>   = <namedValue> | <value>
<literal>    = number | <qtext> | <word> | <list> | <block>
<message>    = '(' <value> <listItem>* ')'
<name>       = <chain> | <qtext> | <word> | number
<namespace>  = '!' | '!?' | '#' | '#?' | '%' | '%?' | '%*' | '%*?' | '%/' | '%/?" // Storage-related opWords
<namedValue> = <name> '=' <value>
<shebang>    = '#!' singleLine // For *NIX executable scripts
<statement>  = <jsEmbed> | <value> | <debug>
<qtext>      = ( "'" text "'" ) | ( '"' text '"' )
<value>      = <chain> | <literal> | <varReqName>
<varName>    = <qtext> | <word> | integer
<varOptName> = <namespace> <varName>?
<varReqName> = <namespace> <varName>
<word>       = opWord | regularWord // Types of "word-literals"
```

## Notes

- The exact details are covered in [Mesgjs Text And Numbers](Mesgjs-Text-And-Numbers.md), but as an approximation, `opWords` ("op-words") are unquoted words beginning with (most) special characters, and `regularWords` ("regular words") are unquoted words begining with `@`, `:`, or alphanumerics.
- Namespace-retrieval `opWords` all also correspond to live, messageable objects (see `<varOptName>` (no-`<varName>` case) and `<chain>`).
- "Dangling" namespace-retrieval `opWords` (not followed by a message (`<chain>`) or an operand (`<varReqName>`)) have no special meaning and just evaluate to their literal textual value, e.g. the list `[#]` is equivalent to `['#']`.
- The `=` operator is strictly for key/value *association* (*assignments* happen as a *side effect* of *executing messages* like `(nset)` or `(set)`; *there are no assignment operators in Mesgjs*).
