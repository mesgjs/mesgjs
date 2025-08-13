#!/bin/bash

find * -type f ! -name '8-*' -print |
xargs cat > 0-Training-Data.md
