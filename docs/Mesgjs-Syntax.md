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
<jsEmbed>    = '@js(*' multiLine '*)' // JavaScript content
<list>       = '[' <listItem>* ']'
<listItem>   = <namedValue> | <value>
<literal>    = number | <qtext> | word | <list> | <block>
<message>    = '(' <value> <listItem>* ')'
<name>       = <chain> | <qtext> | word | number
<namespace>  = '!' | '!?' | '#' | '#?' | '%' | '%?'
<namedValue> = <name> '=' <value>
<shebang>    = '#!' singleLine // For *NIX executable scripts
<statement>  = <jsEmbed> | <value> | <debug>
<qtext>      = ( "'" text "'" ) | ( '"' text '"' )
<value>      = <chain> | <literal> | <varReqName>
<varName>    = <qtext> | word | integer
<varOptName> = <namespace> <varName>?
<varReqName> = <namespace> <varName>
```
