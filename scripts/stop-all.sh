#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="$ROOT/.runtime/run"

kill_pid() {
  local pid_file="$1" name="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "Stopped $name (pid $pid)"
    fi
    rm -f "$pid_file"
  fi
}

kill_port() {
  local port="$1" name="$2"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "Stopping $name on port $port ($pids)"
    kill $pids 2>/dev/null || true
  fi
}

kill_pid "$RUN/web.pid" "web"
kill_pid "$RUN/backend.pid" "backend"
kill_pid "$RUN/engine.pid" "engine"
# `pnpm dev` may leave the Next child process behind; make sure the ports are free.
kill_port 3001 "web"
kill_port 8080 "backend"
kill_port 8000 "engine"
"$ROOT/scripts/mysql.sh" stop
echo "All SmartPlanner services are stopped."
