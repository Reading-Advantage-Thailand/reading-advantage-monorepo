# Test Strategy: DB Package — Migration Ledger Integrity + Hardening

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration (real Postgres) | Contract / Artifact | Smoke (bounded) |
|-------|------|-----------------------------|---------------------|-----------------|
| 1 Contract | — | — | `sentinels.ts` shape, README presence, `package.json` exports/`doctor` script | doctor stub exits 2 |
| 2 Red | journal-integrity, barrel hygiene, fail-fast guards (mock `process.env`) | stale-ledger sim, doctor on docker compose | — | node-ESM `import()` smoke |
| 3 Green | same units pass | same integration passes | snapshot diff = empty | rebuild + repeat ESM smoke |
| 4 Deploy | — | fresh-DB migrate→doctor end-to-end | cloudbuild.yaml step ordering & flag parse | doctor `--check` exit 0 vs. seeded divergence |

Pyramid bias: fast unit + a **small** real-DB band (stale-ledger sim, doctor). Avoid spinning Postgres for journal/barrel/guard tests.

## 2. Shared Fixtures & Mocks

- `packages/db/src/__tests__/_fixtures/journal.ts` — loaders for `drizzle/meta/_journal.json` and `drizzle/*.sql` directory listing (used by FR-1/FR-2/FR-8).
- `packages/db/src/__tests__/_fixtures/pg-test-db.ts` — owns docker compose `pg_test` lifecycle: `createScratchDatabase()` returns a unique DB name + URLs (`DATABASE_URL`, `DIRECT_DATABASE_URL`); `dropScratchDatabase()` in `afterAll`. Reused by stale-ledger sim and doctor tests.
- `applyMigrationsThrough(scratchUrl, lastIdx)` — runs Drizzle migrator against a temp journal slice; central seam for "ledger ends at 0016" simulations.
- `sentinelProbes` map (Task 2) — single source of truth shared by doctor implementation **and** doctor tests (import the map, do not duplicate).
- Existing `connection-options.test.ts` pattern is the template for FR-7 env-mocking tests (use `vi.stubEnv` + `afterEach` restore).

## 3. Cross-Phase Edge Cases & Dependencies

- **0018 race with `auth_security_hardening_20260611`:** journal-integrity test must pass whether auth landed 0018 first or this track adds it. Treat presence-of-0018-entry as a property, not a value.
- **0019 already exists on disk** (`session_token_hash` from auth track). FR-8 must claim 0020+ — Task 12 of plan says "next free number"; assert in test that the new sessions-indexes migration's idx == max(existing)+1.
- **Re-stamp safety invariant (spec §FR-1 constraint):** test that every re-stamped `when` for idx 0–16 is **≤ 1779120000000**, and idx 17+ is **> 1779120000000**. Protects production ledgers.
- **Doctor `--repair` must never DDL:** spy/log `postgres.js` statements during repair; assert zero `CREATE|ALTER|DROP` tokens.
- **FR-6 ESM ↔ FR-9 barrel:** the Node-ESM smoke must run *after* both extension fix and barrel split — otherwise it can pass for the wrong reason (seed module masking a relative-import miss).
- **Build-phase guard (FR-7):** mock `NEXT_PHASE === "phase-production-build"` to assert no-throw; mock `NODE_ENV=production` + missing URL + no build phase to assert throw. Both in same file to prevent regression.

## 4. Architecture Guardrails

- Business logic stays out of `packages/db`. Doctor is a script + pure helper module (`scripts/migration-ledger-doctor.ts` + testable functions in `scripts/lib/`). Tests import the helpers, not the CLI.
- All DB-touching tests go through `createPrivilegedDb`/`db` exports — no ad-hoc `postgres()` construction outside `_fixtures/pg-test-db.ts`.
- No new top-level barrel exports. Seed access must be tested through `@reading-advantage/db/seed` subpath only (FR-9 acceptance).
- Sentinel probes are `information_schema` queries only — no production data reads, no DDL.

## 5. Per-Phase Test Approach

- **Phase 1:** Pure file-existence + JSON-shape asserts on contract stubs. Doctor stub must exit 2 (probed by command-construction test, not full spawn).
- **Phase 2 (Red):** Author every failing test listed in Tasks 4–7. Each must fail on `main` for the *intended* reason — capture the exact assertion message in the task commit so Green can verify symmetry. Stale-ledger sim uses `applyMigrationsThrough(url, 16)` then `pnpm migrate` and asserts 0017 sentinel appears.
- **Phase 3 (Green):** Implement FR-1/3/6/7/8/9 one task at a time; after each, re-run only the targeted file(s) for fast feedback. Final task runs full `pnpm --filter @reading-advantage/db test`.
- **Phase 4:** Cloudbuild YAML linted via `js-yaml` parse + step-order assertion (artifact contract). Live behavior proven by fresh-DB end-to-end in CI (`docker compose up -d pg_test && pnpm migrate && pnpm doctor --check`).

## 6. Build-Graph Findings That Shaped This Strategy

- `build-graph stats`: graph fresh (2026-06-12), 273 files, 498 functions. Used for blast-radius confidence.
- `callers(createPrivilegedDb)` → only `purgeExpiredAuditEvents` (auth) + `resolveTestDatabaseUrl` (test setup). Privileged-fallback warn test (FR-7) needs **no** consumer mocking — direct unit test is sufficient. Doctor will become the second production caller; reuse existing test-setup URL plumbing.
- `callers(registerShutdownHandler)` → **0 callers**. Confirms FR-9 dead-code deletion is safe; no test needs to cover removal beyond "import no longer resolves".
- `search(PORTFOLIO_PROJECTS)` → no graph nodes (large data const, not a function/class). Grep + tsc check-types across `domain` + `codecamp-advantage` is the regression net for the seed-subpath move; build-graph cannot help here — relied on plan Task 13's explicit consumer list (2 files).
- No graph nodes for `_journal.json` / `information_schema` (data files / SQL strings). Journal integrity therefore drives off filesystem reads, not graph traversal.

## 7. Live-Proof Plan (Red → Green/Closeout Gates)

Every gate command runs from `packages/db/` unless noted. "Targeted Red" runs a single test file (no glob fallthrough). "Closeout Gate" is the production-shipping proof.

| Phase | Targeted Red Command | Green / Closeout Gate | Live vs. Artifact |
|-------|----------------------|------------------------|-------------------|
| 1 | `pnpm vitest run src/__tests__/contract-stubs.test.ts` (file presence, exports map, doctor script registered) — must initially FAIL | same command exits 0 | **Artifact contract** only |
| 2 | `pnpm vitest run src/__tests__/journal-integrity.test.ts` — FAIL on current journal | (deferred to Phase 3) | **Artifact contract** (journal JSON) |
| 2 | `CI=true PG_TEST_URL=postgres://... pnpm vitest run src/__tests__/stale-ledger.test.ts` — FAIL (0017 skipped) | (deferred to Phase 3) | **Live behavior** (real migrator) |
| 2 | `CI=true PG_TEST_URL=... pnpm vitest run src/__tests__/ledger-doctor.test.ts` — FAIL (stub exits 2) | (deferred to Phase 3) | **Live behavior** (real DB) |
| 2 | `pnpm vitest run src/__tests__/package-esm-smoke.test.ts` — FAIL (extensionless import) | (deferred to Phase 3) | **Bounded smoke**: spawns `node --input-type=module -e "import('<absolute dist>/index.js')"` with a 10s timeout; asserts exit 0 and explicit "imported" stdout marker. No directory globbing. |
| 2 | `pnpm vitest run src/__tests__/env-guards.test.ts` — FAIL (silent default) | (deferred to Phase 3) | Unit (mocked env) |
| 3 | per-task targeted re-run of the Phase 2 file | `CI=true pnpm --filter @reading-advantage/db test` exits 0 with **baseline 526 + new** count | mix |
| 3 (FR-5) | n/a | `pnpm --filter @reading-advantage/db generate -- --dry-run` → "No schema changes detected" string match | Live (drizzle-kit) |
| 4 | `node --experimental-vm-modules scripts/lint-cloudbuild.test.mjs` — FAIL until step added | same command + `cloud-build local-builder` dry-run of the migrate+doctor step against `pg_test` exits 0 | Artifact (YAML lint) **plus** live (local-builder smoke) |
| 4 closeout | n/a | Full repo: `pnpm turbo run lint test check-types build` exits 0; fresh-DB E2E script `scripts/ci/fresh-db-e2e.sh` exits 0 (`docker compose up pg_test → migrate → doctor --check`) | Live |

### Fake-Harness Discipline

- The only fake permitted is `_fixtures/pg-test-db.ts`'s **scratch DB allocator** (plumbing for test isolation). It wraps a **real** Postgres — no in-memory shim.
- Doctor `--repair` statement-spy in unit tests is a fake **logger only**; the parallel `ledger-doctor.test.ts` integration test exercises the real `postgres()` client end-to-end, so the production gate command (`pnpm doctor --check` / `--repair`) is covered by at least one non-fake path.
- Cloudbuild YAML lint (artifact) is paired with a bounded `gcloud builds submit --no-source --config=<step-only>` dry-run smoke; together they cover the production deploy-gate command. Neither falls through to a full pipeline run.

### Intentionally-Red Files & Discovery Hygiene

- During Phase 2, **every** new test file under `src/__tests__/` will be red. Vitest discovery runs the whole `__tests__` glob, so the **task-level Red gate** must use the explicit file path (table above) — not `pnpm test` — to avoid sweeping unrelated failures.
- Each newly red file is owned by a still-`[~]` Phase 3 task: journal-integrity ↔ Task 8, stale-ledger ↔ Task 8, ledger-doctor ↔ Task 9, package-esm-smoke ↔ Task 10, env-guards ↔ Task 11, barrel hygiene (added inside `package-esm-smoke.test.ts` or sibling) ↔ Task 13.
- `CI=true pnpm --filter @reading-advantage/db test` is therefore **forbidden as a Red gate** during Phase 2 and is only used as the Phase 3 closeout gate. The plan's Task 16 wording already aligns; this strategy makes the prohibition explicit.
- No test file should be `.skip`'d or excluded via `vitest.config` — ownership is tracked by the task marker `[~]`, and Phase 3 completion is gated on every red file flipping green.
