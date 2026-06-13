#!/usr/bin/env bash
# fresh-db-e2e.sh — Phase 4 closeout gate for db_migration_ledger_20260611.
#
# Spins up a fresh Postgres via docker compose, runs all Drizzle migrations,
# and validates ledger integrity with the doctor --check command.
#
# Usage:
#   scripts/ci/fresh-db-e2e.sh
#
# Prerequisites:
#   - Docker (or Podman with docker-compose compatibility)
#   - pnpm installed
#   - .env with DATABASE_URL pointing at localhost (or override via env)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"
PG_CONTAINER="reading-advantage-postgres"

echo "==> Starting fresh Postgres via docker compose…"
docker compose -f "${COMPOSE_FILE}" up -d postgres

echo "==> Waiting for Postgres to be ready…"
for i in $(seq 1 30); do
  if docker exec "${PG_CONTAINER}" pg_isready -U postgres >/dev/null 2>&1; then
    echo "    Postgres is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Postgres did not become ready within 30 seconds." >&2
    exit 2
  fi
  sleep 1
done

echo "==> Resetting reading_advantage database for a fresh migration run…"
docker exec "${PG_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS reading_advantage WITH (FORCE);"
docker exec "${PG_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE reading_advantage;"

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reading_advantage"
export DIRECT_DATABASE_URL="${DATABASE_URL}"

echo "==> Running pnpm migrate (Drizzle)…"
cd "${REPO_ROOT}"
pnpm --filter @reading-advantage/db migrate

echo "==> Running pnpm doctor --check…"
pnpm --filter @reading-advantage/db doctor --check

echo "==> Fresh-DB E2E gate PASSED."
