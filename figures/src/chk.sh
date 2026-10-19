#!/bin/zsh
# chk.sh name ax,ay ex,ey : headless text checks, then copy the page to dist/look for the live look
cd "${0:a:h}"; python3 look.py "$@" | grep -v png; mkdir -p ../../dist/look; cp hairline-$1.html ../../dist/look/
