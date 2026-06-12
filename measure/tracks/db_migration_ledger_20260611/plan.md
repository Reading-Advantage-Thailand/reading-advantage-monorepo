# Implementation Plan: DB Package — Migration Ledger Integrity + Hardening

_Blast radius: `db`/`client` (imported by every package and app — FR-6/FR-7 touch import-time behavior; mitigated by bundler-only resolution today and the warn-not-throw rule outside production runtime). `createPrivilegedDb` (retention purge job + doctor). Journal/meta changes have no code callers — they affect `drizzle-kit migrate` only._

## Phase 1: Contract & Schema Definition

- [~] Task 1: Journal re-stamp design note
    - [ ] Create `packages/db/drizzle/meta/README.md`: strict-`<` migrator semantics (drizzle-orm 0.44.7 `pg-core/dialect.js:62`), the chosen interpolation stamps for idx 3–8, 11, 13–15, 17 (and 18), and the hand-written-migration protocol (SQL file + journal entry + integrity test)
    - [ ] Table of old → new `when` per re-stamped entry; entries 0–16 all ≤ 1779120000000, 17+ above

- [~] Task 2: Sentinel-probe contract for the doctor
    - [ ] For each migration 0000–0018, derive one cheap schema sentinel (table or column existence via `information_schema`) from its DDL; record as a typed map in `packages/db/scripts/sentinels.ts`
    - [ ] Define doctor exit codes: 0 clean, 1 divergence, 2 connection/config error

- [~] Task 3: Contract stubs
    - [ ] `scripts/migration-ledger-doctor.ts` scaffold with `--check` / `--repair` arg parsing, exits 2 (not implemented)
    - [ ] `package.json`: add `"doctor": "tsx scripts/migration-ledger-doctor.ts"` script; add `"./seed"` subpath to `exports` map
    - [ ] `users.ts` schema: add `sessions_user_id_idx` + `sessions_expires_at_idx` `index()` entries (migration SQL in Phase 3)

- [x] **Phase 1 Red gate — `src/__tests__/contract-stubs.test.ts`** (added 2026-06-12, mid role)
    - Targeted Red command: `./node_modules/.bin/vitest run src/__tests__/contract-stubs.test.ts` (from `packages/db/`; equivalent to `pnpm vitest run src/__tests__/contract-stubs.test.ts` per test-strategy §5)
    - Result: **15 / 15 failed** (all missing contract artifacts — exactly the intended Red reason)
    - Failures map to: 6 × `drizzle/meta/README.md` missing, 3 × `scripts/sentinels.ts` missing, 3 × `scripts/migration-ledger-doctor.ts` missing, 1 × `package.json` lacks `scripts.doctor`, 1 × `package.json` lacks `exports["./seed"]`, 1 × `src/schema/users.ts` lacks `sessions_user_id_idx` / `sessions_expires_at_idx`
    - Red-commit SHA: `5ef40d4f` (test-only commit; 15 / 15 fail on master, ENOENT + undefined-field reasons)

- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

---

## Phase 2: Test (Red Phase)

- [ ] Task 4: Failing tests — FR-1/FR-2 journal integrity (`packages/db/src/__tests__/journal-integrity.test.ts`)
    - [ ] File ↔ journal-entry parity both directions (catches unregistered 0018 today)
    - [ ] `idx` contiguous from 0
    - [ ] `when` strictly increasing with `idx`, unique (catches 2025-era stamps + 0010/0011 duplicate today)
    - [ ] Era sanity: no stamp >1 year from the median of its neighbors
    - [ ] Confirm fail against current journal (Red)

- [ ] Task 5: Failing test — FR-1 stale-ledger simulation (`packages/db/src/__tests__/stale-ledger.test.ts`, real DB via docker compose)
    - [ ] Fresh DB → apply migrations through 0016 → assert `migrate` then applies 0017 (sentinel: `science_*.school_id`)
    - [ ] Confirm fail with the current journal (0017 skipped) (Red)

- [ ] Task 6: Failing tests — FR-3 doctor (`packages/db/src/__tests__/ledger-doctor.test.ts`, real DB)
    - [ ] Clean DB: `--check` exits 0
    - [ ] Hand-patched simulation (apply 0014 SQL directly, no ledger row): report flags it, exits 1; `--repair` inserts exactly that row; re-run exits 0
    - [ ] `--repair` never executes DDL (assert via statement log/spy)
    - [ ] Confirm fail (Red — stub exits 2)

- [ ] Task 7: Failing tests — FR-6/FR-7/FR-9 package behavior
    - [ ] Node-ESM smoke: spawn `node --input-type=module -e "import('<dist>/index.js')"` with stub `DATABASE_URL` — currently fails on extensionless `./users` (Red)
    - [ ] `connection-options`/client guard: production runtime + missing `DATABASE_URL` → throw; dev → single warn (Red)
    - [ ] `privileged`: fallback to `DATABASE_URL` warns once (Red)
    - [ ] Root barrel no longer exports `PORTFOLIO_PROJECTS`; `@reading-advantage/db/seed` does (Red)

- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

---

## Phase 3: Implement (Green Phase)

- [ ] Task 8: Implement FR-1 — re-stamp `_journal.json`
    - [ ] Apply the Task 1 stamp table; register 0018 if the auth track hasn't (`when` above 0017's new stamp)
    - [ ] Verify Tasks 4 & 5 pass (Green)

- [ ] Task 9: Implement FR-3 — ledger doctor
    - [ ] Report mode: journal × ledger × sentinel matrix, divergence detection per spec
    - [ ] `--repair`: ledger-row inserts only, wrapped in a transaction
    - [ ] Verify Task 6 passes (Green)

- [ ] Task 10: Implement FR-6 — `.js` extensions across `packages/db/src`
    - [ ] `schema/index.ts` (13 lines) + any other extensionless relative imports (`grep -rn "from \"\./\|from \"\.\./" src | grep -v '\.js"'`)
    - [ ] Rebuild; verify Node-ESM smoke passes (Green)

- [ ] Task 11: Implement FR-7 — fail-fast + fallback warn
    - [ ] `client.ts` production-runtime throw / dev warn (guard Next build phase)
    - [ ] `privileged.ts` warn-on-fallback
    - [ ] Verify Task 7 guard tests pass (Green)

- [ ] Task 12: Implement FR-8 — sessions indexes migration
    - [ ] Write `drizzle/00NN_sessions_indexes.sql` (next free number; auth track holds 0019) + journal entry per the new protocol
    - [ ] Verify fresh-DB migrate + journal-integrity test stay green

- [ ] Task 13: Implement FR-9 — barrel hygiene
    - [ ] Remove seed re-export from `src/index.ts`; create `src/seed/index.ts` subpath entry
    - [ ] Update `packages/domain/src/codecamp/progress.ts` and the codecamp prod-smoke test import
    - [ ] Delete `src/shutdown.ts`
    - [ ] Verify Task 7 barrel tests pass; domain + codecamp suites green

- [ ] Task 14: Implement FR-5 — snapshot refresh
    - [ ] Produce current snapshot via `drizzle-kit generate` on a scratch copy; keep snapshot meta, discard duplicate SQL
    - [ ] Verify: `drizzle-kit generate` on the real package now reports no schema changes

- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

---

## Phase 4: Deploy Gate + Docs & Doctor

- [ ] Task 15: Implement FR-4 — codecamp deploy gate
    - [ ] `apps/codecamp-advantage/cloudbuild.yaml`: migrate + `doctor --check` step against `DIRECT_DATABASE_URL` before traffic shift; non-zero exit fails the build
    - [ ] Document the gate pattern for other apps in `packages/db/README.md`

- [ ] Task 16: Full suites and quality gates
    - [ ] `CI=true pnpm --filter @reading-advantage/db test` (baseline 526 + new)
    - [ ] `pnpm --filter @reading-advantage/db check-types && build`; domain + api + codecamp suites (seed subpath consumers)
    - [ ] Fresh-DB end-to-end: `docker compose` Postgres → `pnpm migrate` → `pnpm doctor --check` exits 0
    - [ ] Top-level `npm run build`

- [ ] Task 17: Project memory + production runbook
    - [ ] Update tech-debt P0 row: db-side root cause fixed (journal), doctor available; remaining open scope = running `--repair` against each production DB and wiring gates for non-codecamp apps
    - [ ] Production reconciliation runbook in `packages/db/README.md`: doctor report → review → `--repair` per environment (requires `DIRECT_DATABASE_URL`; coordinate with ops)
    - [ ] Lessons-learned: drizzle migrator strict-`<` `when` semantics (apply at retro)

- [ ] Task: Measure - User Manual Verification 'Phase 4: Deploy Gate + Docs & Doctor' (Protocol in workflow.md)
