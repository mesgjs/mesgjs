from pygments.lexer import RegexLexer, bygroups, using
from pygments.token import Text, Comment, Operator, Keyword, Name, String, Number, Punctuation
from pygments.lexers.javascript import JavascriptLexer

class MesgjsLexer(RegexLexer):
    """
    For Mesgjs source code (.msjs).
    """
    name = 'Mesgjs'
    aliases = ['mesgjs', 'msjs']
    filenames = ['*.msjs']
    mimetypes = ['text/x-mesgjs']

    tokens = {
        'root': [
            # Shebang (for executable scripts)
            (r'^#!.*$', Comment.Hashbang),
            
            # ConfigSLID block start
            (r'\[\(', Comment.Preproc, 'configslid'),
            
            # Embedded JS start
            (r'@js\{', Keyword.Control, 'jsembed'),
            
            # Comments
            (r'//.*$', Comment.Single),
            (r'/\*', Comment.Multiline, 'comment'),
            
            # Strings
            (r"'", String.Single, 'string_single'),
            (r'"', String.Double, 'string_double'),
            
            # Numbers
            # Floats
            (r'[+-]?\d+(\.\d+)?([eE][+-]?\d+)?\b', Number.Float),
            # Integers (including binary, octal, hex, and BigInt 'n')
            (r'[+-]?(?:0[bB][01]+|0[oO][0-7]+|0[xX][0-9a-fA-F]+|\d+)n?\b', Number.Integer),
            
            # Special Primitives / Constants
            (r'(@[cdefntu]|@gss|@mid|@mps|@nan|@posinf|@neginf)\b', Keyword.Constant),
            (r'@debug\{', Keyword.Reserved),
            (r'!(?=\})', Keyword.Reserved), # returning block end marker
            
            # Storage / Namespaces
            (r'(\!|#|%[*/]?)\??', Name.Namespace),
            
            # Operators / Op-words
            # '=' followed by special chars or signed numbers
            (r'=(?=[!#%@:]|[+-]\d)', Operator),
            # Other operator sequences
            (r'(?![@:])(?:[`~@#$%^&*=|.:,;<>?]|/(?![/*])|!(?![}])|[+-](?!\d))+', Operator),
            
            # Punctuation / Delimiters
            (r'[\{\}\[\]\(\)]', Punctuation),
            
            # Regular Words
            (r'([^\s(){}\[\]!#%=\'"/]|/(?![/*]))+', Name.Variable),
            
            # Whitespace
            (r'\s+', Text),
        ],
        'configslid': [
            (r'\)\]', Comment.Preproc, '#pop'),
            (r'.+?', Comment.Preproc),
        ],
        'jsembed': [
            # Delegate the inner JS content to Pygments' JavascriptLexer,
            # then pop back to root when the closing '@}' is encountered.
            (r'(?s)(.*?)(@\})', bygroups(using(JavascriptLexer), Keyword.Control), '#pop'),
        ],
        'comment': [
            (r'[^*/]+', Comment.Multiline),
            (r'/\*', Comment.Multiline, '#push'),
            (r'\*/', Comment.Multiline, '#pop'),
            (r'[*/]', Comment.Multiline),
        ],
        'string_single': [
            (r"[^'\\]+", String.Single),
            (r"\\.", String.Escape),
            (r"'", String.Single, '#pop'),
        ],
        'string_double': [
            (r'[^"\\]+', String.Double),
            (r'\\.', String.Escape),
            (r'"', String.Double, '#pop'),
        ],
    }
