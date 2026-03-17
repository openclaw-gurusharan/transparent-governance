#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-9222}"
URL="http://127.0.0.1:${PORT}/json/version"

echo "[browser] checking CDP endpoint: $URL"
curl -fsS "$URL"
echo
