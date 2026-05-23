# Specification: science-advantage Test Infra — Prisma → Drizzle Migration

## Overview

Replace the science-advantage Vitest test setup so that integration tests run against a Drizzle-migrated Postgres database instead of a Prisma-pushed one. Carve out unit-test isolation as a natural side effect by splitting the shared `vitest.setup.ts` into per-config setup files.

**Sub-track of:** `prisma_drizzle_science_controllers_20260505` (Track 3). Track 3 cannot verify integration-test parity until this is fixed; pulled forward from `measure/tech-debt.md` (2026-05-23 High-severity entry).

## Problem

`apps/science-advantage/vitest.setup.ts` runs `execSync('npx prisma db push --force-reset')` on every test file. After Track 1's migration `0013` created Postgres enums (`StandardsAlignment` et al.), `prisma db push` fails with `ERROR: type "StandardsAlignment" already exists` because Prisma's CREATE TYPE has no IF NOT EXISTS path. The setup also forces a re-push on every file (slow) and forces DB connectivity even for unit tests that should not need it.

## Functional Requirements

### FR-1: Drizzle-backed test DB
- Dedicated test database `science_advantage_test` on the existing Postgres container (port 5432) — no second container.
- Schema applied via `pnpm --filter @reading-advantage/db migrate` with `DATABASE_URL` pointed at the test DB.

### FR-2: One migration per integration run
- `vitest.integration.config.ts` uses a `globalSetup` that runs `drizzle-kit migrate` once at the start of the run, not on every file.
- Per-test fixtures continue to use truncate-and-reseed (the pattern already in the pilot test `route.integration.test.ts`).

### FR-3: Unit/integration setup separation
- `vitest.unit.config.ts` references `vitest.unit.setup.ts` (already exists, DB-free) and **does not** load any DB-touching setup.
- A new `vitest.integration.setup.ts` holds the env wiring; the integration globalSetup script runs migrations.
- The shared `vitest.setup.ts` is retired (or trimmed to a DB-free shim if anything still references it).

### FR-4: Smoke verification
- The Track 3 pilot integration test (`app/api/lessons/[lessonSlug]/route.integration.test.ts`) runs end-to-end and passes.
- At least one existing unit test runs without attempting a DB connection.

### FR-5: Documentation
- `apps/science-advantage/AGENTS.md` documents `TEST_DATABASE_URL`, the one-time `createdb` step, and how to run integration tests locally.

## Acceptance Criteria

1. `createdb science_advantage_test` succeeds and the DB is reachable.
2. `pnpm --filter @reading-advantage/db migrate` with `DATABASE_URL` pointing at the test DB applies all migrations cleanly on a fresh DB.
3. `CI=true pnpm --filter science-advantage test:integration -- route.integration.test.ts` (the pilot file) returns 0 with all 5 cases green.
4. `CI=true pnpm --filter science-advantage test` (unit suite) runs without ever opening a Postgres connection (verify via `grep` of any reasonable Postgres marker in process trace, or by running with the test DB stopped).
5. `apps/science-advantage/AGENTS.md` updated with a `## Local Test Database` section.
6. No `prisma db push` / `prisma generate` / `@prisma/client` references remain in `vitest.setup.ts`, `vitest.unit.setup.ts`, `vitest.integration.config.ts`, or any new setup file introduced by this track.

## Out of Scope

- Replacing seed scripts (`prisma/seed*.ts`) — Track 3 Phase 6.
- Removing Prisma from app code (Track 3 Phases 1–5).
- Transaction-rollback-per-test (would require sweeping rewrite of 8 existing integration tests; truncate-and-reseed is the MVP).
- Making every unit test in the repo DB-free (broader cleanup — stays in tech-debt).
- Test-DB provisioning in CI (CI already runs its own containers; this sub-track targets local dev).
