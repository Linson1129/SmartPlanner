#!/usr/bin/env bash
# Project-local MySQL instance. It never touches a system-wide MySQL server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
MYSQL_DIR="$RUNTIME/mysql"
DATA_DIR="$MYSQL_DIR/data"
SOCKET="$MYSQL_DIR/mysql.sock"
PID_FILE="$MYSQL_DIR/mysql.pid"
PORT="${SMARTPLANNER_MYSQL_PORT:-3307}"
DB_NAME="${SMARTPLANNER_DB_NAME:-smartplanner}"
DB_USER="${SMARTPLANNER_DB_USERNAME:-smartplanner}"
DB_PASSWORD="${SMARTPLANNER_DB_PASSWORD:-smartplanner}"
LOG_DIR="$RUNTIME/logs"
MYSQLD="${MYSQLD:-$(command -v mysqld || true)}"

if [[ -z "$MYSQLD" ]]; then
  echo "mysqld not found. Install MySQL first (brew install mysql)." >&2
  exit 1
fi

MYSQL_BASE="${MYSQL_BASE:-$(brew --prefix mysql 2>/dev/null || true)}"
if [[ -z "$MYSQL_BASE" ]]; then
  MYSQL_BASE="$(cd "$(dirname "$MYSQLD")/.." && pwd)"
fi

mkdir -p "$MYSQL_DIR" "$DATA_DIR" "$LOG_DIR"

is_running() {
  mysqladmin --socket="$SOCKET" -uroot ping >/dev/null 2>&1
}

init_db() {
  if [[ -d "$DATA_DIR/mysql" ]]; then
    return
  fi
  echo "Initializing project MySQL data directory at $DATA_DIR"
  "$MYSQLD" --no-defaults --initialize-insecure \
    --basedir="$MYSQL_BASE" \
    --datadir="$DATA_DIR" \
    --log-error="$LOG_DIR/mysql-init.log"
}

create_schema_and_user() {
  mysql --socket="$SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
}

start() {
  if is_running; then
    echo "MySQL already running on port $PORT (socket: $SOCKET)"
    create_schema_and_user
    return
  fi
  init_db
  echo "Starting MySQL on 127.0.0.1:$PORT ..."
  nohup "$MYSQLD" --no-defaults \
    --datadir="$DATA_DIR" \
    --port="$PORT" \
    --socket="$SOCKET" \
    --pid-file="$PID_FILE" \
    --log-error="$LOG_DIR/mysql.log" \
    --bind-address=127.0.0.1 \
    --mysqlx=0 \
    >/dev/null 2>&1 &
  local launcher=$!
  echo "$launcher" > "$MYSQL_DIR/launcher.pid"
  for _ in $(seq 1 40); do
    if is_running; then
      create_schema_and_user
      echo "MySQL is ready."
      return
    fi
    sleep 0.5
  done
  echo "MySQL failed to start. See $LOG_DIR/mysql.log" >&2
  tail -20 "$LOG_DIR/mysql.log" >&2 || true
  exit 1
}

stop() {
  if is_running; then
    echo "Stopping project MySQL ..."
    mysqladmin --socket="$SOCKET" -uroot shutdown
    for _ in $(seq 1 20); do
      if ! is_running; then
        echo "MySQL stopped."
        return
      fi
      sleep 0.5
    done
    echo "MySQL did not stop cleanly." >&2
    exit 1
  else
    echo "MySQL is not running."
  fi
}

status() {
  if is_running; then
    echo "MySQL running on 127.0.0.1:$PORT"
    mysql --socket="$SOCKET" -uroot -N -e "SELECT CONCAT('database=', SCHEMA_NAME) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='${DB_NAME}';"
  else
    echo "MySQL stopped."
    exit 1
  fi
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *) echo "Usage: $0 {start|stop|restart|status}" >&2; exit 2 ;;
esac
