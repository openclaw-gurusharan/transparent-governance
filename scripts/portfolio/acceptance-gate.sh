#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

RUN_DETERMINISTIC=1
RUN_BROWSER=1

usage() {
  cat <<'EOF'
usage: ./scripts/portfolio/acceptance-gate.sh [--deterministic-only] [--browser-only]

Runs the portfolio acceptance gate in the workspace.

Modes:
  --deterministic-only  Run health checks and deterministic checks only.
  --browser-only        Run the live trust-state matrix only.

Default:
  Runs both deterministic checks and the live browser trust matrix.
EOF
}

print_browser_launch_hint() {
  cat >&2 <<'EOF'
[hint] start the required Chrome Beta debug-profile session with:
if ! curl -sf http://127.0.0.1:9222/json/version >/dev/null; then
  open -na "Google Chrome Beta" --args \
    --remote-debugging-port=9222 \
    --user-data-dir="$HOME/.codex/chrome-beta-debug-profile"
fi
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --deterministic-only)
      RUN_BROWSER=0
      ;;
    --browser-only)
      RUN_DETERMINISTIC=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[error] unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

run_step() {
  local label="$1"
  shift
  echo
  echo "[step] $label"
  "$@"
}

check_service() {
  local label="$1"
  local url="$2"
  if ! curl -sf "$url" >/dev/null; then
    echo "[error] missing required service: $label ($url)" >&2
    echo "[hint] start the local stack or the missing repo dev server before running browser validation." >&2
    return 1
  fi
}

if [ "$RUN_BROWSER" -eq 1 ]; then
  run_step "browser and service preflight" /bin/zsh -lc "
    curl -sf http://127.0.0.1:9222/json/version >/dev/null || {
      echo '[error] Chrome Beta debug session is not available on 127.0.0.1:9222' >&2
      $(typeset -f print_browser_launch_hint)
      print_browser_launch_hint
      exit 1
    }
  "
  check_service "aadhaar-chain gateway" "http://127.0.0.1:43101/health"
  check_service "flatwatch backend" "http://127.0.0.1:43104/api/health"
  check_service "ondc-buyer frontend" "http://127.0.0.1:43102"
  check_service "ondc-seller frontend" "http://127.0.0.1:43103"
  check_service "flatwatch frontend" "http://127.0.0.1:43105"
fi

if [ "$RUN_DETERMINISTIC" -eq 1 ]; then

  run_step "aadhaar-chain gateway tests" /bin/zsh -lc "
    cd '$ROOT/aadhaar-chain/gateway'
    PYTHONPATH=\"\$PWD/venv/lib/python3.12/site-packages\${PYTHONPATH:+:\$PYTHONPATH}\" \
    PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
    /Users/gurusharan/.pyenv/versions/3.12.0/bin/python3 -m pytest tests/test_routes.py -q
  "

  run_step "ondc-buyer checks" /bin/zsh -lc "
    cd '$ROOT/ondc-buyer'
    npm run lint
    npm run typecheck
    npm run test
    npm run build
  "

  run_step "ondc-seller checks" /bin/zsh -lc "
    cd '$ROOT/ondc-seller'
    npm run lint
    npm run typecheck
    npm run test
    npm run build
  "

  run_step "flatwatch backend tests" /bin/zsh -lc "
    cd '$ROOT/flatwatch/backend'
    PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
    python3 -m pytest -q -p pytest_asyncio.plugin --asyncio-mode=auto
  "

  run_step "flatwatch frontend checks" /bin/zsh -lc "
    cd '$ROOT/flatwatch/frontend'
    npm run test -- --runInBand
    npm run lint
    npm run build
  "
fi

if [ "$RUN_BROWSER" -eq 1 ]; then
  run_step "live trust matrix" "$ROOT/scripts/portfolio/verify-trust-matrix.py"
fi

echo
echo "[done] portfolio acceptance gate passed"
