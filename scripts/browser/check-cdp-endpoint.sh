#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-9222}"
URL="http://127.0.0.1:${PORT}/json/version"
LIST_URL="http://127.0.0.1:${PORT}/json/list"

diagnose_listener() {
  local listeners
  listeners="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$listeners" ]; then
    echo "[browser] no process is listening on port $PORT" >&2
    return 0
  fi

  echo "[browser] process listening on port $PORT:" >&2
  printf '%s\n' "$listeners" >&2
}

print_recovery_hint() {
  cat >&2 <<EOF
[browser] recovery:
  1. Close or move the non-CDP process currently using port $PORT.
  2. Use the Chrome plugin/system Chrome flow to attach the Chrome Beta debug
     profile that exposes DevTools JSON on 127.0.0.1:$PORT.
  3. Do not substitute a clean automation browser for wallet or logged-in
     acceptance testing.
EOF
}

echo "[browser] checking CDP endpoint: $URL"
if ! body="$(curl -fsS "$URL" 2>/tmp/codex-cdp-curl.err)"; then
  status="$(curl -sS -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || true)"
  if [ "$status" = "404" ]; then
    echo "[browser] endpoint is listening but does not expose DevTools JSON: $URL" >&2
    echo "[browser] expected Chrome Beta debug profile on port $PORT, not a regular Chrome profile or non-CDP listener." >&2
    diagnose_listener
    print_recovery_hint
  else
    echo "[browser] endpoint unavailable: $URL" >&2
    if [ -s /tmp/codex-cdp-curl.err ]; then
      cat /tmp/codex-cdp-curl.err >&2
    fi
    diagnose_listener
    print_recovery_hint
  fi
  exit 1
fi

case "$body" in
  *'"Browser"'*|*'"webSocketDebuggerUrl"'*)
    printf '%s\n' "$body"
    ;;
  *)
    echo "[browser] endpoint returned JSON, but it does not look like a Chrome DevTools endpoint." >&2
    printf '%s\n' "$body" >&2
    exit 1
    ;;
esac

echo "[browser] checking target list: $LIST_URL"
curl -fsS "$LIST_URL" >/dev/null
echo
