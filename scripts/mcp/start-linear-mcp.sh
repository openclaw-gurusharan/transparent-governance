#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${LINEAR_API_KEY:-}" ]]; then
  echo "Missing LINEAR_API_KEY in $ENV_FILE" >&2
  exit 1
fi

exec npx -y mcp-remote \
  https://mcp.linear.app/mcp \
  --transport streamable-http \
  --header "Authorization: Bearer ${LINEAR_API_KEY}"
