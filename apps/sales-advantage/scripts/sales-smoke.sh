#!/usr/bin/env bash
# ─── Sales Advantage — Post-Deploy Smoke Test ────────────────
#
# Usage:
#   ./scripts/sales-smoke.sh [URL]
#
# If URL is omitted, defaults to https://sales-advantage-XXXX.a.run.app
# (replace XXXX with the actual Cloud Run hash).
#
# This smoke test checks basic unauthenticated endpoints:
#   - GET /en -> 200 (localized landing page loads)
#   - GET /api/auth/session -> 200 (may return {user:null} for unauth)
#
# Authenticated smoke tests (login, dashboard, roleplay, etc.)
# require credentials and are deferred:human-gated.
#
# Exits non-zero on any failure.
# ──────────────────────────────────────────────────────────────

set -euo pipefail

BASE_URL="${1:-https://sales-advantage-XXXX.a.run.app}"

echo "=== Sales Advantage Smoke Test ==="
echo "Target: $BASE_URL"
echo ""

failures=0

# ── Test 1: Localized landing page ──────────────────────────
echo "--- Test 1: GET /en -> 200 ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/en" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  PASS (HTTP $HTTP_STATUS)"
else
  echo "  FAIL (HTTP $HTTP_STATUS — expected 200)"
  failures=$((failures + 1))
fi

# ── Test 2: Auth session endpoint ───────────────────────────
echo "--- Test 2: GET /api/auth/session -> 200 ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/session" 2>/dev/null || echo "000")
BODY=$(curl -s "$BASE_URL/api/auth/session" 2>/dev/null || echo '{"error":"unreachable"}')
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  PASS (HTTP $HTTP_STATUS, body: $BODY)"
else
  echo "  FAIL (HTTP $HTTP_STATUS — expected 200, body: $BODY)"
  failures=$((failures + 1))
fi

# ── Test 3: tRPC endpoint ───────────────────────────────────
echo "--- Test 3: POST /api/trpc -> 401 (unauth) ---"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/api/trpc/sales.dashboard?input=%7B%22json%22%3Anull%7D" \
  2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "401" ]; then
  echo "  PASS (HTTP $HTTP_STATUS — expected 401 for unauth tRPC call)"
else
  echo "  FAIL (HTTP $HTTP_STATUS — expected exact unauthenticated 401)"
  failures=$((failures + 1))
fi

echo ""
echo "=== Results: $failures failure(s) ==="
exit $failures
