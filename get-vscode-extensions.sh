#!/usr/bin/env bash

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

LINKS_FILE="$OUT_DIR/extensions-link.txt"
INSTALL_FILE="$OUT_DIR/extensions-download.txt"

: > "$LINKS_FILE"
: > "$INSTALL_FILE"

code --list-extensions | sort | awk -F'.' '
{
  name=$2
  gsub(/-/, " ", name)
  name=toupper(substr(name,1,1)) substr(name,2)

  print "- [" name "](https://marketplace.visualstudio.com/items?itemName=" $0 ")" >> "'"$LINKS_FILE"'"
  print "code --install-extension " $0 >> "'"$INSTALL_FILE"'"
}
'
