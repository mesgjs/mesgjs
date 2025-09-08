#!/bin/bash
# Execute from within docs-ai-training

output="0-Mesgjs-Training-Data.md"

echo "Assembling \"$output\"..."
find * -type f ! -name '0-*' -print |
while read file
do
    echo "$file..." >&2
    cat "$file"
    echo ""
done > "$output"
echo Done
