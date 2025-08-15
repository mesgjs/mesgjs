#!/bin/bash
# Execute from docs-ai-training

echo Checking...
find . ! -name '8-*' -name '*.md' -print |
sed -e 's/\.\///' |
while read file
do
    [ "$file" -ot "../docs/$file" ] && echo "Stale: $file"
done
echo Done