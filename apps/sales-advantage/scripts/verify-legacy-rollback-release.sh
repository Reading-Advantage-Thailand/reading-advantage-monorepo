#!/usr/bin/env bash
set -euo pipefail

: "${BUILD_ID:?BUILD_ID is required}"
: "${SALES_DIRECT_DATABASE_URL:?SALES_DIRECT_DATABASE_URL is required}"
: "${SALES_LEGACY_ROLLBACK_URL:?SALES_LEGACY_ROLLBACK_URL is required}"
: "${SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST:?SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST is required}"

probe_session_id="__sales_rollback_probe__:${BUILD_ID}"
session_token="$(openssl rand -hex 32)"
session_token_hash="$(printf %s "$session_token" | sha256sum | cut -d " " -f 1)"

cleanup() {
  psql "$SALES_DIRECT_DATABASE_URL" \
    --set=probe_session_id="$probe_session_id" \
    -f apps/sales-advantage/scripts/sales-legacy-rollback-session-cleanup.sql
  unset session_token session_token_hash SALES_LEGACY_ROLLBACK_SESSION_TOKEN
}
trap cleanup EXIT

psql "$SALES_DIRECT_DATABASE_URL" \
  --set=probe_session_id="$probe_session_id" \
  --set=session_token_hash="$session_token_hash" \
  --set=repair_manifest="$SALES_LEGACY_SOURCE_ROLE_REPAIR_MANIFEST" \
  -f apps/sales-advantage/scripts/sales-legacy-rollback-session-setup.sql
export SALES_LEGACY_ROLLBACK_SESSION_TOKEN="$session_token"
pnpm --filter sales-advantage exec tsx scripts/verify-legacy-rollback.ts
cleanup
trap - EXIT
