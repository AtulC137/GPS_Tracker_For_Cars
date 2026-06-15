#!/usr/bin/env bash
# Smoke-test OwnTracks HTTP ingest via ngrok.
# Usage: ./scripts/test-owntracks-ingest.sh [tid]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"
TID="${1:-AT}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing backend/.env — copy backend/.env.example first." >&2
  exit 1
fi

# shellcheck disable=SC1090
source <(grep -E '^[A-Z_]+=' "$ENV_FILE" | sed 's/^/export /')

if [[ -z "${NGROK_DOMAIN:-}" ]]; then
  echo "NGROK_DOMAIN is not set in backend/.env" >&2
  exit 1
fi

URL="https://${NGROK_DOMAIN}/api/v1/ingest/owntracks"
TST=$(date +%s)
BODY=$(cat <<EOF
{"_type":"location","lat":18.52,"lon":73.85,"vel":0,"cog":0,"tst":${TST},"tid":"${TID}"}
EOF
)

echo "POST $URL (tid=$TID)"

AUTH_ARGS=()
if [[ -n "${INGEST_TOKEN:-}" ]]; then
  AUTH_ARGS=(-H "Authorization: Bearer ${INGEST_TOKEN}")
fi

RESPONSE=$(curl -sS -w "\n%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  "${AUTH_ARGS[@]}" \
  -d "$BODY")

BODY_OUT=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "Status: $STATUS"
echo "Body:   $BODY_OUT"

if [[ "$STATUS" == "200" && "$BODY_OUT" == "[]" ]]; then
  echo "PASS: OwnTracks HTTP ingest accepted (200 + [])"
  exit 0
fi

if [[ "$STATUS" == "401" ]]; then
  echo "FAIL: unauthorized — set Authorization: Bearer <INGEST_TOKEN> in OwnTracks HTTP headers"
  exit 1
fi

if [[ "$STATUS" == "404" ]]; then
  echo "FAIL: unknown device — enable AUTO_REGISTER_OWTRACKS_PHONES or register phone-${TID} in the database"
  exit 1
fi

echo "FAIL: unexpected response"
exit 1
