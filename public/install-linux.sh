#!/bin/sh
set -e

BIN_DIR="${HOME}/.local/bin"

ARCH=$(uname -m)
case "$ARCH" in
    aarch64) TARGET="aarch64-linux" ;;
    x86_64)  TARGET="x86_64-linux" ;;
    *)       printf 'Unsupported architecture: %s\n' "$ARCH" >&2; exit 1 ;;
esac

VERSION=$(curl -fsSL "https://api.github.com/repos/withcapsule/CLI/releases/latest" \
    | grep '"tag_name"' \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
[ -z "$VERSION" ] && { printf 'Could not fetch latest version\n' >&2; exit 1; }

URL="https://github.com/withcapsule/CLI/releases/download/${VERSION}/capsule-${TARGET}.tar.gz"

mkdir -p "${BIN_DIR}"
TMP=$(mktemp -d)
trap 'rm -rf "${TMP}"' EXIT

printf 'Installing capsule %s (%s)...\n' "$VERSION" "$TARGET"
curl -fsSL "$URL" | tar -xz -C "${TMP}"
chmod +x "${TMP}/capsule"
mv "${TMP}/capsule" "${BIN_DIR}/capsule"

printf 'Installed capsule to %s/capsule\n' "$BIN_DIR"

case ":${PATH}:" in
    *":${BIN_DIR}:"*) ;;
    *)
        printf '\n~/.local/bin is not in your PATH.\n'
        printf 'Add this line to ~/.bashrc or ~/.profile:\n'
        printf '  export PATH="$HOME/.local/bin:$PATH"\n'
        ;;
esac
