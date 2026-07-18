#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?Usage: accounts-smoke.sh <base-url>}"

curl -fsS "$BASE_URL/api/health" | grep -q '"status":"alive"'
curl -fsS "$BASE_URL/api/ready" | grep -q '"status":"ready"'
DISCOVERY="$(curl -fsS "$BASE_URL/.well-known/openid-configuration")"
printf '%s' "$DISCOVERY" | grep -q '"response_types_supported":\["code"\]'
printf '%s' "$DISCOVERY" | grep -q '"code_challenge_methods_supported":\["S256"\]'
curl -fsS "$BASE_URL/api/oidc/jwks" | grep -q '"alg":"RS256"'

STATUS="$(curl -sS -o /tmp/accounts-admin.json -w '%{http_code}' "$BASE_URL/api/admin/employees")"
if [ "$STATUS" != "401" ]; then
  printf 'Expected anonymous admin denial 401, received %s\n' "$STATUS" >&2
  exit 1
fi

printf 'Accounts smoke passed: health readiness discovery jwks anonymous-denial\n'
