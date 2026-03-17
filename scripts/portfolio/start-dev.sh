#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
RUNTIME_DIR="$ROOT/.codex/portfolio-dev"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "[stop] clearing port $port"
    kill -9 $pids 2>/dev/null || true
  fi
}

start_service() {
  local name="$1"
  local port="$2"
  local health_url="$3"
  local cwd="$4"
  local command="$5"
  local log_file="$LOG_DIR/$name.log"
  local pid_file="$PID_DIR/$name.pid"

  kill_port "$port"

  echo "[start] $name"
  nohup /bin/zsh -lc "cd '$cwd' && $command" >"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"

  for _ in {1..30}; do
    if curl -sf "$health_url" >/dev/null 2>&1; then
      echo "[ready] $name -> $health_url"
      return 0
    fi
    sleep 1
  done

  echo "[error] $name did not become ready. See $log_file"
  return 1
}

AADHAAR_GATEWAY_PYTHONPATH="$ROOT/aadhaar-chain/gateway/venv/lib/python3.12/site-packages"
AADHAAR_GATEWAY_PYTHON="/Users/gurusharan/.pyenv/versions/3.12.0/bin/python3"

start_service \
  "aadhaar-gateway" \
  "8000" \
  "http://127.0.0.1:8000/health" \
  "$ROOT/aadhaar-chain/gateway" \
  "env PYTHONPATH='$AADHAAR_GATEWAY_PYTHONPATH\${PYTHONPATH:+:\$PYTHONPATH}' '$AADHAAR_GATEWAY_PYTHON' main.py"

start_service \
  "aadhaar-frontend" \
  "3000" \
  "http://127.0.0.1:3000" \
  "$ROOT/aadhaar-chain/frontend" \
  "npm run dev -- --hostname 127.0.0.1 --port 3000"

start_service \
  "ondc-buyer" \
  "3002" \
  "http://127.0.0.1:3002" \
  "$ROOT/ondc-buyer" \
  "npm run dev -- --host 127.0.0.1 --port 3002"

start_service \
  "ondc-seller" \
  "3003" \
  "http://127.0.0.1:3003" \
  "$ROOT/ondc-seller" \
  "npm run dev -- --host 127.0.0.1 --port 3003"

start_service \
  "flatwatch-backend" \
  "8001" \
  "http://127.0.0.1:8001/api/health" \
  "$ROOT/flatwatch/backend" \
  "python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

start_service \
  "flatwatch-frontend" \
  "3004" \
  "http://127.0.0.1:3004" \
  "$ROOT/flatwatch/frontend" \
  "npm run dev -- --hostname 127.0.0.1 --port 3004"

echo
echo "[done] portfolio dev stack is ready"
echo "  AadhaarChain frontend: http://127.0.0.1:3000"
echo "  AadhaarChain gateway:  http://127.0.0.1:8000/health"
echo "  ONDC Buyer:            http://127.0.0.1:3002"
echo "  ONDC Seller:           http://127.0.0.1:3003"
echo "  FlatWatch frontend:    http://127.0.0.1:3004"
echo "  FlatWatch backend:     http://127.0.0.1:8001/api/health"
