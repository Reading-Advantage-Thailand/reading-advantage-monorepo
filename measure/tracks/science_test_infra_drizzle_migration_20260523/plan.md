# Implementation Plan: science-advantage Test Infra — Prisma → Drizzle Migration

## Phase 0: Provision the test database

- [ ] Task: `docker exec reading-advantage-postgres createdb -U postgres science_advantage_test`; verify connectivity (`psql ... -c "SELECT 1"`); confirm DB is empty (`\dt` returns nothing).
- [ ] Task: Run `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test pnpm --filter @reading-advantage/db migrate`; confirm all migrations apply on a fresh DB; spot-check that `science_*` tables (incl. the 4 new junctions from 0015) and `users`/`sessions`/`accounts` exist.

## Phase 1: Integration globalSetup runs drizzle migrate

- [ ] Task: Create `apps/science-advantage/vitest.integration.setup.ts` (per-file env wiring only — derives the `_test`-suffixed `TEST_DATABASE_URL`, exports nothing DB-side).
- [ ] Task: Create `apps/science-advantage/vitest.integration.global-setup.ts` that runs `drizzle-kit migrate` against the test DB exactly once per run via `execSync('pnpm --filter @reading-advantage/db migrate', { env: { ...process.env, DATABASE_URL: testUrl } })`; idempotent — safe to re-run on a warm DB. Wire it into `vitest.integration.config.ts` via `globalSetup`.
- [ ] Task: Update `vitest.integration.config.ts` to reference the new setup files; remove any inherited `setupFiles: ['./vitest.setup.ts']` that pulls in Prisma.

## Phase 2: Unit/integration setup split

- [ ] Task: Verify `vitest.unit.config.ts` does not load `vitest.setup.ts` (or remove the reference if it does). Confirm `vitest.unit.setup.ts` is DB-free.
- [ ] Task: Retire `vitest.setup.ts` — either delete it or strip to a DB-free shim. Grep for any remaining importers.

## Phase 3: Smoke verification

- [ ] Task: `CI=true pnpm --filter science-advantage test:integration -- route.integration.test.ts` (Track 3 pilot) — must exit 0 with all 5 cases green.
- [ ] Task: Run one existing unit test in isolation (e.g. `pnpm --filter science-advantage test -- lib/<picked>.test.ts`) — confirm no DB connection attempts (visually inspect log; optionally stop the container and re-run as a stronger check).

## Phase 4: Documentation

- [ ] Task: Update `apps/science-advantage/AGENTS.md` with a `## Local Test Database` section: createdb one-liner, `TEST_DATABASE_URL` env, `pnpm test` vs `pnpm test:integration` distinction, troubleshooting note for "type already exists" if anyone tries to point Prisma at the test DB.

## Phase 5: Hand back to Track 3

- [ ] Task: Add a one-line prerequisite note at the top of Track 3's Phase 1 in `measure/tracks/prisma_drizzle_science_controllers_20260505/plan.md` pointing at this sub-track's archive path.
- [ ] Task: Close the tech-debt entry "science-advantage integration test infra incompatible with Drizzle-first DBs" (mark Resolved, link this track).
