#!/bin/bash

# This script assembles the MWI training data from multiple source files.
# It is intended to be run from the 'docs' directory.

set -e

TARGET_FILE="MWI-Training-Data.md"

# --- Helper Function ---
append_file() {
  # Add a separator if the target file already has content
  [ -s "$TARGET_FILE" ] && echo -e "\n\n---\n\n" >> "$TARGET_FILE"
  cat "$1" >> "$TARGET_FILE"
  echo "Appended $1"
}

# --- Main Script ---
echo "Assembling MWI training data..."

# Truncate the file to start fresh
> "$TARGET_FILE"

# List of files to assemble
FILES=(
  "Mesgjs-10-Minute-Overview.md"
  "Tutorial-Bilingual-Interfaces.md"
  "Mesgjs-Language-Overview.md"
  "Mesgjs-For-JavaScript-Programmers.md"
  "JavaScript-Interface-Development.md"
  "JavaScript-Runtime-Reference.md"
  "Mesgjs-Messaging-Overview.md"
  "Mesgjs-Syntax.md"
  "Mesgjs-Text-And-Numbers.md"
  "Mesgjs-Module-Configuration.md"
  "Static-List-Data-SLID-Format.md"
)

# Append top-level documents
for FILE in "${FILES[@]}"; do
  append_file "$FILE"
done

# Append all files from the interfaces directory
for f in interfaces/*.md; do
  [ -f "$f" ] && append_file "$f"
done

# Append all files from the command-line directory
for f in command-line/*.md; do
  [ -f "$f" ] && append_file "$f"
done

echo "Assembly complete. Output written to $TARGET_FILE"
