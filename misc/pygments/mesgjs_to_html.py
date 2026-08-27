#!/usr/bin/env python3
import sys
import os
from pygments import highlight
from pygments.formatters import HtmlFormatter

# Ensure the directory containing mesgjs_lexer.py is in the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from mesgjs_lexer import MesgjsLexer
except ImportError as e:
    print(f"Error importing MesgjsLexer: {e}", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input_file.msjs>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, 'r', encoding='utf-8') as f:
        code = f.read()

    lexer = MesgjsLexer()
    # Use full=True to generate a complete HTML document with CSS in the <head>
    formatter = HtmlFormatter(full=True, style='monokai', linenos=True, title=f"Mesgjs Highlight: {os.path.basename(input_path)}")

    # Highlight and write directly to stdout
    highlight(code, lexer, formatter, outfile=sys.stdout)

if __name__ == '__main__':
    main()
