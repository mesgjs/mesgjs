#!/bin/bash
# Execute from docs-ai-training

echo Checking...
find . ! -name '0-*' -name '*.md' -print |
sed -e 's/\.\///' |
while read file
do
    source="../docs/$file"
    if [ ! -f "$source" ]
    then
	echo "Orphan: $file"
    elif [ "$file" -ot "../docs/$file" ]
    then
	echo "Stale: $file"
    fi
done
echo Done
