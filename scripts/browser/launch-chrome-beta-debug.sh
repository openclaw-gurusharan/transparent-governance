#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-9222}"
SOURCE_PROFILE_ROOT="${SOURCE_PROFILE_ROOT:-$HOME/Library/Application Support/Google/Chrome Beta}"
DEBUG_PROFILE_ROOT="${DEBUG_PROFILE_ROOT:-$HOME/.codex/chrome-beta-debug-profile}"
PROFILE_DIRECTORY="${PROFILE_DIRECTORY:-Default}"
CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta}"

if [ ! -d "$SOURCE_PROFILE_ROOT" ]; then
  echo "[browser] source profile missing: $SOURCE_PROFILE_ROOT" >&2
  exit 1
fi

if [ ! -x "$CHROME_BIN" ]; then
  echo "[browser] chrome binary missing or not executable: $CHROME_BIN" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEBUG_PROFILE_ROOT")"
rm -rf "$DEBUG_PROFILE_ROOT"
cp -R "$SOURCE_PROFILE_ROOT" "$DEBUG_PROFILE_ROOT"

echo "[browser] launching Chrome Beta debug profile on port $PORT"
echo "[browser] source profile: $SOURCE_PROFILE_ROOT"
echo "[browser] debug profile: $DEBUG_PROFILE_ROOT"
echo "[browser] profile directory: $PROFILE_DIRECTORY"

exec "$CHROME_BIN" \
  --user-data-dir="$DEBUG_PROFILE_ROOT" \
  --profile-directory="$PROFILE_DIRECTORY" \
  --remote-debugging-port="$PORT"
