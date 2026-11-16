#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Python scheduling engine =="
(cd "$ROOT/engine" && .venv/bin/pytest)

echo "== Java backend =="
(cd "$ROOT/backend" && mvn test)

echo "== Frontend unit tests =="
(cd "$ROOT/web" && pnpm test)

echo "== Frontend production build =="
if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Web is already running on port 3000; skipping the production build to avoid sharing .next."
  echo "Stop it with ./scripts/stop-all.sh and rerun this script for a clean build check."
else
  (cd "$ROOT/web" && pnpm build)
fi

echo
echo "All automated tests passed."
