#!/usr/bin/env bash
# Functional smoke test against a running local stack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API="${SMARTPLANNER_API_URL:-http://127.0.0.1:8080}"
ENGINE="${SMARTPLANNER_ENGINE_URL:-http://127.0.0.1:8000}"
TMP_DIR="$ROOT/.runtime/smoke"
mkdir -p "$TMP_DIR"

PASS=0
FAIL=0
CREATED_IDS=()

cleanup() {
  for id in "${CREATED_IDS[@]:-}"; do
    if [[ -n "${id:-}" && "$id" != "null" && "$id" != "0" ]]; then
      curl -s -X DELETE "$API/api/events/$id" >/dev/null 2>&1 || true
    fi
  done
}
trap cleanup EXIT

ok() {
  PASS=$((PASS + 1))
  printf "  \033[32m✓\033[0m %s\n" "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf "  \033[31m✗\033[0m %s\n" "$1"
}

json() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d' + sys.argv[1]))" "$1"
}

echo "SmartPlanner P0 + P2 smoke test"
echo "  API:    $API"
echo "  Engine: $ENGINE"

echo "[1] health"
curl -sf "$API/actuator/health" | grep -q '"UP"' && ok "Java API health" || fail "Java API health"
curl -sf "$ENGINE/health" | grep -q '"status":"ok"' && ok "Python engine health" || fail "Python engine health"
STATUS_JSON="$(curl -sf "$API/api/system/status")"
[[ "$(echo "$STATUS_JSON" | json "['engineAvailable']")" == "True" ]] && ok "Java -> Python engine connected" || fail "Java -> Python engine connected"

echo "[2] reads"
PROFILE="$(curl -sf "$API/api/profile")"
[[ -n "$(echo "$PROFILE" | json "['displayName']")" ]] && ok "profile" || fail "profile"
OVERVIEW="$(curl -sf "$API/api/overview")"
[[ -n "$(echo "$OVERVIEW" | json "['date']")" ]] && ok "overview" || fail "overview"
EVENTS="$(curl -sf "$API/api/events")"
python3 -c 'import json,sys; d=json.load(sys.stdin); assert isinstance(d,list); print(len(d))' <<<"$EVENTS" >/dev/null && ok "events list" || fail "events list"
HOLIDAYS="$(curl -sf "$API/api/holidays?year=2026")"
echo "$HOLIDAYS" | grep -q '2026-12-25' && ok "2026 Macao holiday calendar" || fail "2026 Macao holiday calendar"

echo "[3] weather + nlp + drag"
TODAY="$(date '+%Y-%m-%d')"
WEATHER="$(curl -sf "$API/api/weather?from=$TODAY&to=$TODAY")"
echo "$WEATHER" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert "available" in d and isinstance(d.get("days"), list)' >/dev/null && ok "weather endpoint" || fail "weather endpoint"
NLP_RESP="$(curl -sf -X POST "$API/api/nlp/parse" -H 'Content-Type: application/json' -d '{"text":"明天下午3点和队友开会，优先级高"}')"
[[ "$(echo "$NLP_RESP" | json "['title']")" == "和队友开会" ]] && ok "nlp parse title" || fail "nlp parse title"
[[ "$(echo "$NLP_RESP" | json "['priority']")" == "HIGH" ]] && ok "nlp parse priority" || fail "nlp parse priority"

MOVE_BODY='{"title":"Smoke move","type":"NORMAL","priority":"MEDIUM","startAt":"2027-02-01T10:00:00","endAt":"2027-02-01T11:00:00","weatherSensitive":true,"lookaheadDays":3,"notes":"smoke test, safe to delete"}'
MOVE_CREATED="$(curl -sf -X POST "$API/api/events" -H 'Content-Type: application/json' -d "$MOVE_BODY")"
MOVE_ID="$(echo "$MOVE_CREATED" | json "['event']['id']")"
CREATED_IDS+=("$MOVE_ID")
MOVE_RESP="$(curl -sf -X PATCH "$API/api/events/$MOVE_ID/move" -H 'Content-Type: application/json' -d '{"startAt":"2027-02-01T11:15:00","endAt":"2027-02-01T12:15:00"}')"
[[ "$(echo "$MOVE_RESP" | json "['event']['startAt']")" == "2027-02-01T11:15:00" ]] && ok "drag move persisted" || fail "drag move persisted"
[[ "$(echo "$MOVE_CREATED" | json "['event']['weatherSensitive']")" == "True" ]] && ok "weather sensitivity persisted" || fail "weather sensitivity persisted"

echo "[4] conflict + assisted reschedule"
BODY_A='{"title":"Smoke A","type":"NORMAL","priority":"HIGH","startAt":"2027-01-15T10:00:00","endAt":"2027-01-15T11:00:00","notes":"smoke test, safe to delete"}'
RESP_A="$(curl -sf -X POST "$API/api/events" -H 'Content-Type: application/json' -d "$BODY_A")"
ID_A="$(echo "$RESP_A" | json "['event']['id']")"
CREATED_IDS+=("$ID_A")
[[ -n "$ID_A" ]] && ok "create event A (id=$ID_A)" || fail "create event A"

BODY_B='{"title":"Smoke B","type":"NORMAL","priority":"MEDIUM","startAt":"2027-01-15T10:30:00","endAt":"2027-01-15T11:30:00","notes":"smoke test, safe to delete"}'
RESP_B="$(curl -sf -X POST "$API/api/events" -H 'Content-Type: application/json' -d "$BODY_B")"
ID_B="$(echo "$RESP_B" | json "['event']['id']")"
CREATED_IDS+=("$ID_B")
CONFLICTS="$(echo "$RESP_B" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["analysis"]["conflicts"]))')"
[[ "$CONFLICTS" -ge 1 ]] && ok "overlap detected ($CONFLICTS conflict)" || fail "overlap detected"
SUGGESTIONS="$(echo "$RESP_B" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["analysis"]["suggestions"]))')"
[[ "$SUGGESTIONS" -ge 1 ]] && ok "reschedule suggestion returned" || fail "reschedule suggestion returned"

if [[ "$SUGGESTIONS" -ge 1 ]]; then
  APPLY_BODY="$(echo "$RESP_B" | python3 -c 'import json,sys; d=json.load(sys.stdin); s=d["analysis"]["suggestions"][0]; print(json.dumps({"changes":[{"eventId":c["eventId"],"startAt":c["startAt"],"endAt":c["endAt"]} for c in s["changes"]],"anchorEventId":d["event"]["id"]}))')"
  APPLY_RESP="$(curl -sf -X POST "$API/api/schedule/apply" -H 'Content-Type: application/json' -d "$APPLY_BODY")"
  REMAINING="$(echo "$APPLY_RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d["analysis"]["conflicts"]))')"
  [[ "$REMAINING" -eq 0 ]] && ok "suggestion applied, conflict cleared" || fail "suggestion applied, remaining conflicts=$REMAINING"
fi

echo "[5] goal lifecycle"
YESTERDAY="$(date -v-1d '+%Y-%m-%dT09:00:00' 2>/dev/null || date -d 'yesterday 09:00' '+%Y-%m-%dT09:00:00')"
GOAL_BODY="$(printf '{"title":"Smoke goal","type":"GOAL","priority":"HIGH","startAt":"%s","notes":"smoke test, safe to delete"}' "$YESTERDAY")"
GOAL_RESP="$(curl -sf -X POST "$API/api/events" -H 'Content-Type: application/json' -d "$GOAL_BODY")"
GOAL_ID="$(echo "$GOAL_RESP" | json "['event']['id']")"
CREATED_IDS+=("$GOAL_ID")
COMPLETED="$(curl -sf -X PATCH "$API/api/events/$GOAL_ID/complete")"
GOAL_TYPE="$(echo "$COMPLETED" | json "['type']")"
GOAL_FLAG="$(echo "$COMPLETED" | json "['goalCompleted']")"
[[ "$GOAL_TYPE" == "CONTAINER" && "$GOAL_FLAG" == "True" ]] && ok "goal completed -> container" || fail "goal completed -> container"

echo "[6] presence-aware reminders"
HB="$(curl -sf -X POST "$API/api/presence/heartbeat" -H 'Content-Type: application/json' -d '{"sessionId":"smoke-session","active":true,"visible":true}')"
[[ -n "$(echo "$HB" | json "['serverTime']")" ]] && ok "heartbeat accepted" || fail "heartbeat accepted"

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "PASS: $PASS checks"
else
  echo "FAIL: $PASS passed, $FAIL failed"
  exit 1
fi
