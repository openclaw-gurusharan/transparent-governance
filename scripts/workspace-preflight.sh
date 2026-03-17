#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

echo "[workspace] root: $ROOT"

if [ -f "$ROOT/.codex/config.toml" ]; then
  echo "[config] .codex/config.toml: present"
else
  echo "[config] .codex/config.toml: missing"
fi

if [ -f "$ROOT/.env.example" ]; then
  echo "[config] .env.example: present"
else
  echo "[config] .env.example: missing"
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex] CLI not found"
  exit 1
fi

echo "[codex] version: $(codex --version)"
echo
echo "[mcp] status:"
codex mcp list
