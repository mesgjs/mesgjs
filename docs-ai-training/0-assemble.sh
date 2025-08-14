#!/bin/bash
# Execute from within docs-ai-training

find * -type f ! -name '0-*' -print |
xargs cat > 0-Training-Data.md
