#!/usr/bin/env bash
# Start the complete SmartPlanner P0 stack for local development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
LOGS="$RUNTIME/logs"
RUN="$RUNTIME/run"
mkdir -p "$LOGS" "$RUN"

wait_http() {
  local url="$1" name="$2"
  for _ in $(seq 1 60); do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "  $name ready: $url"
      return 0
    fi
    sleep 1
  done
  echo "  $name did not become ready. Check $LOGS." >&2
  return 1
}

echo "[1/4] MySQL"
"$ROOT/scripts/mysql.sh" start

echo "[2/4] Python scheduling engine"
if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
  echo "  engine already running"
else
  if [[ ! -x "$ROOT/engine/.venv/bin/python" ]]; then
    echo "  creating Python virtual environment"
    python3 -m venv "$ROOT/engine/.venv"
    "$ROOT/engine/.venv/bin/pip" install --quiet -r "$ROOT/engine/requirements.txt"
  fi
  (
    cd "$ROOT/engine"
    nohup .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 \
      > "$LOGS/engine.log" 2>&1 &
    echo $! > "$RUN/engine.pid"
  )
  wait_http http://127.0.0.1:8000/health "engine"
fi

echo "[3/4] Java API"
if curl -sf http://127.0.0.1:8080/actuator/health >/dev/null 2>&1; then
  echo "  API already running"
else
  (
    cd "$ROOT/backend"
    echo "  packaging backend ..."
    mvn -q -DskipTests package
  )
  nohup java -jar "$ROOT/backend/target/smartplanner-server.jar" \
    > "$LOGS/backend.log" 2>&1 &
  echo $! > "$RUN/backend.pid"
  wait_http http://127.0.0.1:8080/actuator/health "API"
fi

echo "[4/4] Next.js web"
if curl -sf http://127.0.0.1:3001 >/dev/null 2>&1; then
  echo "  web already running"
else
  if [[ ! -d "$ROOT/web/node_modules" ]]; then
    echo "  installing web dependencies ..."
    (cd "$ROOT/web" && pnpm install)
  fi
  (
    cd "$ROOT/web"
    nohup pnpm dev > "$LOGS/web.log" 2>&1 &
    echo $! > "$RUN/web.pid"
  )
  wait_http http://127.0.0.1:3001 "web"
fi

cat <<INFO

SmartPlanner is running:
  Web       http://127.0.0.1:3001
  Java API  http://127.0.0.1:8080/api/overview
  Engine    http://127.0.0.1:8000/health
  MySQL     127.0.0.1:${SMARTPLANNER_MYSQL_PORT:-3308}/${SMARTPLANNER_DB_NAME:-smartplanner}

Logs: $LOGS
Stop: $ROOT/scripts/stop-all.sh
INFO
