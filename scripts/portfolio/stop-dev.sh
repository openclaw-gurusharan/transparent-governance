#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_DIR="$ROOT/.codex/portfolio-dev/pids"

stop_pid_file() {
  local pid_file="$1"
  if [ ! -f "$pid_file" ]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[stop] $pid"
    kill "$pid" >/dev/null 2>&1 || true
  fi
  rm -f "$pid_file"
}

for pid_file in "$PID_DIR"/*.pid; do
  [ -e "$pid_file" ] || continue
  stop_pid_file "$pid_file"
done

for port in 43100 43101 43102 43103 43104 43105; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "[kill] clearing port $port"
    kill -9 $pids 2>/dev/null || true
  fi
done

echo "[done] portfolio dev stack stopped"
