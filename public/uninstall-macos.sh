#!/bin/sh
set -e

BIN="${HOME}/.local/bin/capsule"

if [ -f "$BIN" ]; then
    rm -f "$BIN"
    printf 'Removed %s\n' "$BIN"
else
    printf 'capsule not found at %s\n' "$BIN"
fi
