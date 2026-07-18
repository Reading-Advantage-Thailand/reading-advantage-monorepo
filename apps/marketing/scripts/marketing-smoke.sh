#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Post-deploy smoke test for the marketing Cloud Run service.
#
# Usage:
#   bash apps/marketing/scripts/marketing-smoke.sh <base-url>
#
# Examples:
#   bash apps/marketing/scripts/marketing-smoke.sh https://marketing-abc123-xyz.a.run.app
#   bash apps/marketing/scripts/marketing-smoke.sh http://localhost:8080
#
# Exits 0 if all unauthenticated checks pass, 1 otherwise.
# Authenticated checks (campaigns, video) require a session cookie and are
# deferred to manual QA (see plan.md).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 <base-url>"
  echo "  e.g. $0 https://marketing-abc123-xyz.a.run.app"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local label="$1" method="$2" path="$3" expected_status="$4" extra_desc="${5:-}"
  local url="${BASE_URL}${path}"
  local status
  status="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url")"

  if [[ "$status" == "$expected_status" ]]; then
    echo "  ✅  $label  ($method $path → $status)"
    PASS=$((PASS + 1))
  else
    echo "  ❌  $label  ($method $path → $status, expected $expected_status)${extra_desc:+ — $extra_desc}"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══ Marketing Smoke Test ═══"
echo "  Target: $BASE_URL"
echo ""

# ── Unauthenticated checks ────────────────────────────────────────────
# (login page must load without session)
echo "── Public routes ──"

check "Homepage loads"           GET  "/"               200
check "Login page loads"         GET  "/login"           200
check "Settings auth shell loads" GET  "/settings"        200

# ── API health ─────────────────────────────────────────────────────────
echo ""
echo "── API health ──"

check "Auth session (no cookie)" GET  "/api/auth/session"  200
check "DB health"                GET  "/api/health/db"     200
check "Settings (no auth)"       GET  "/api/settings"      401
check "Campaigns list (no auth)" GET  "/api/campaigns"     401

# ── Summary ────────────────────────────────────────────────────────────
echo ""
echo "═══ Results: ${PASS} passed, ${FAIL} failed ═══"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
