# Specification: DB Package — Migration Ledger Integrity + Hardening

## Overview

Close the gaps identified in the June 2026 audit of `packages/db`. The
headline finding is **critical**: the Drizzle migration journal's `when`
timestamps are non-monotonic, which causes drizzle-orm's migrator to
**silently skip migrations on existing databases**. This is the db-package
root cause behind the June 8 production incident recorded as the P0
tech-debt item ("deployment does not gate rollout on matching DB
migrations") — the deploy-gate is one half of that fix; a sound ledger is
the other.

Verified against installed `drizzle-orm@0.44.7`
(`pg-core/dialect.js:62`): a migration is applied only when
`Number(lastDbMigration.created_at) < migration.folderMillis`, where
`lastDbMigration` is the single highest-`created_at` row in
`__drizzle_migrations`. Any journal entry whose `when` is ≤ that value is
skipped without warning. Fresh databases apply everything in journal order
(no last row), so local dev and CI never see the bug.

## Functional Requirements

### FR-1: Re-Stamp the Migration Journal to Strict Monotonicity

**Problem:** `packages/db/drizzle/meta/_journal.json` mixes
drizzle-generated 2026 epoch stamps with hand-written entries stamped with
**2025**-era values, plus one duplicate:

| idx | tag | `when` | problem |
|-----|-----|--------|---------|
| 3–8 | 0003–0008 (codecamp et al.) | 1746288000000–1747210000000 (2025-05) | sort **below** idx 2 (2026-04-30) |
| 11 | 0011_codecamp_webhook_events | 1779075476967 | **identical** to idx 10 — strict `<` skips it |
| 13 | 0013_prisma_drizzle_schema_unification | 1748044800000 (2025-05) | below idx 12 |
| 14 | 0014_users_license_expired_date | 1748131200000 (2025-05) | below idx 12 — the columns missing in the June 8 incident |
| 15 | 0015_science_junction_tables | 1779033600000 | below idx 12 (1779080500000) |
| 17 | 0017_science_school_id | 1749081600000 (2025-06) | below idx 16 — would never apply on any DB at 0016 |
| 18 | 0018_audit_events.sql | — | file exists, **no journal entry at all** (also Task 1 of `auth_security_hardening_20260611`) |

On any database whose ledger max is 0016's stamp (1779120000000), running
`drizzle-kit migrate` applies **nothing** for 0017, and 0011/0013/0014/0015
were equally skippable depending on when each environment last migrated.

**Change:** Re-stamp `when` values so they are strictly increasing in `idx`
order and unique:
- Keep correctly-ordered generated stamps (idx 0–2, 9, 10, 12, 16) as-is.
- Re-stamp offenders by interpolating strictly between their correct
  neighbors (idx 3–8 between idx 2 and idx 9; idx 11 between 10 and 12;
  idx 13–15 between 12 and 16) so entries 0–16 all remain ≤ 1779120000000
  (the highest stamp already recorded in production ledgers).
- idx 17 gets a value > 1779120000000; the 0018 entry (whether added here or
  by the auth track first) must sort above 17.
- Document the scheme in a comment-free sidecar note
  (`packages/db/drizzle/meta/README.md`) since JSON allows no comments.

**Constraint:** re-stamping must never make an already-applied migration
re-appliable in any environment — values for 0–16 stay at or below each
environment's plausible ledger max; per-environment divergence is handled by
FR-3, not by stamp choice.

---

### FR-2: Journal Integrity Test

**Problem:** Nothing prevents this from recurring; hand-written journal
entries are the documented workflow (lessons-learned 2026-05-22) but have no
guard rail.

**Change:** New `packages/db/src/__tests__/journal-integrity.test.ts`:
- Every `drizzle/NNNN_*.sql` file has exactly one journal entry whose tag
  matches the filename, and vice versa.
- `idx` values are contiguous from 0.
- `when` values are strictly increasing with `idx` and unique.
- Every `when` plausibly matches the era of its neighbors (no stamp more
  than 1 year from the median of adjacent entries — catches the 2025/2026
  epoch confusion at the source).

---

### FR-3: Migration Ledger Doctor

**Problem:** Production ledgers are now inconsistent with reality: the
June 8 emergency repair hand-patched schema without ledger rows, and skipped
migrations may or may not have been manually applied per environment. There
is no tool to see or fix this.

**Change:** `packages/db/scripts/migration-ledger-doctor.ts` (run via
`pnpm --filter @reading-advantage/db doctor`), connecting through
`DIRECT_DATABASE_URL` (uses `createPrivilegedDb`):
- **Report mode (default, read-only):** for each journal entry, print
  ledger status (row present with which `created_at`) and **schema status**
  via a sentinel probe (table/column existence check derived from each
  migration's DDL — e.g. 0014 → `users.license_id`, 0015 → the four
  junction tables, 0017 → `science_*.school_id`, 0018 → `audit_events`).
  Exit non-zero when any entry is applied-per-schema but missing from the
  ledger, present in ledger but missing per schema, or unapplied while a
  later entry is applied.
- **`--repair`:** insert missing ledger rows (with the journal's `when`) for
  migrations verified applied by sentinel probe; never executes DDL.
- **`--check`:** CI/deploy-safe alias of report mode (non-zero exit on any
  divergence, no output truncation).

---

### FR-4: Deploy Gate for codecamp-advantage

**Problem:** The P0 tech-debt item: deploys do not verify migrations before
shifting traffic; the June 2 image shipped against a stale schema.

**Change:** `apps/codecamp-advantage/cloudbuild.yaml` gains a step that runs
`pnpm --filter @reading-advantage/db migrate` followed by
`doctor --check` against the deploy target's `DIRECT_DATABASE_URL` **before**
the Cloud Run traffic shift; a non-zero doctor exit fails the build. The
pattern is documented in `packages/db/README.md` for the other apps' future
pipelines (their deploy automation is out of scope here).

---

### FR-5: Refresh Drizzle Snapshots / Make `generate` Safe

**Problem:** `drizzle/meta/` has snapshots only up to `0009_snapshot.json`.
`drizzle-kit generate` diffs the schema against the **latest snapshot**, so
running it today emits duplicate DDL for everything added since 0009 — a
loaded footgun sitting behind `pnpm generate`.

**Change:** Produce an up-to-date snapshot reflecting the current schema
(generate on a scratch copy, keep the snapshot, discard the duplicate SQL;
registered as `0018_snapshot.json`-era meta). Document the hand-written
migration protocol (SQL file + journal entry + snapshot expectations) in
`packages/db/README.md`.

---

### FR-6: ESM Import Extension Hygiene

**Problem:** The package is `"type": "module"` but `src/schema/index.ts`
(and others) use extensionless relative imports. With
`moduleResolution: "bundler"`, tsc emits them verbatim into `dist/`, which
plain Node ESM cannot load — the package only works through bundlers.
Lessons-learned (2026-06-10, storage_package) already flagged this exact
trap. `client.ts` uses `.js` extensions; the style is mixed.

**Change:** Add `.js` to every relative import/export in `packages/db/src`;
verify `node -e "import('./dist/index.js')"` resolves (with a stub
`DATABASE_URL`). Add an ESLint guard for the package if available cheaply.

---

### FR-7: Fail Fast on Missing `DATABASE_URL` + Privileged Fallback Warning

**Problems:**
- `client.ts:6-12` silently passes `""` to `postgres()` when `DATABASE_URL`
  is unset — the app connects to localhost defaults and fails at first query
  with a misleading `ECONNREFUSED 127.0.0.1:5432`.
- `privileged.ts:17` silently falls back to `DATABASE_URL`; "privileged"
  operations (e.g. retention purge DELETE on append-only tables) then run on
  the pooled, unprivileged connection and fail mysteriously. The
  connection-pooling lesson (2026-05-25) prescribes warn-on-fallback.

**Changes:**
- `client.ts`: when `DATABASE_URL` is missing/empty, throw at import in
  production runtime (`NODE_ENV === "production"` and not a Next.js build
  phase) and `console.warn` once otherwise (builds/dev import the module
  without a DB).
- `privileged.ts`: `console.warn` once when falling back to `DATABASE_URL`.

---

### FR-8: Index `sessions.user_id` and `sessions.expires_at`

**Problem:** Postgres does not auto-index FK columns. `sessions` has only
the `token` unique index — per-user session queries (and the session-cap +
`revokeAllUserSessions` work in `auth_security_hardening_20260611`) will
sequential-scan, as will any expiry sweep.

**Change:** New migration (take the next free number at implementation time —
the auth track has reserved 0019 for `session_token_hash`) adding
`sessions_user_id_idx` and `sessions_expires_at_idx`; matching `index()`
entries in `packages/db/src/schema/users.ts`.

---

### FR-9: Barrel and Dead-Code Hygiene

**Problems:**
- `src/index.ts` re-exports `PORTFOLIO_PROJECTS` from a 236 KB seed module —
  every consumer of `@reading-advantage/db` pulls curriculum seed content
  into its server bundle.
- `src/shutdown.ts` (`registerShutdownHandler`) is compiled but unreachable:
  not exported from `index.ts` and not in the `exports` map. Dead code.

**Changes:**
- Move the seed export to a `"./seed"` subpath export; update the two
  consumers (`packages/domain/src/codecamp/progress.ts`,
  `apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-4-feature-parity.test.ts`).
- Delete `src/shutdown.ts` (recoverable from git if graceful shutdown is
  later wired through app `instrumentation.ts`).

## Non-Functional Requirements

- The journal re-stamp and doctor must be verified against a **fresh**
  database (`docker compose` Postgres): full `drizzle-kit migrate` from
  empty applies all migrations in idx order, and `doctor --check` exits 0.
- A **stale-ledger simulation** test: ledger seeded as if 0016 were last
  applied, then verify the re-stamped journal makes `migrate` apply
  0017+ (this is the regression test for the incident class).
- No behavior change for bundler-based consumers from FR-6/FR-9 beyond the
  two updated import paths.
- All 526 existing `packages/db` tests stay green.

## Acceptance Criteria

1. `journal-integrity.test.ts` passes; mutating any `when` out of order or
   removing an entry makes it fail.
2. On a database whose ledger ends at 0016, `pnpm migrate` applies 0017 (and
   0018 once registered) — verified by the stale-ledger simulation.
3. Fresh-DB `pnpm migrate` succeeds end-to-end; `doctor --check` exits 0.
4. `doctor` report flags a hand-patched schema (sentinel present, ledger row
   missing) and `--repair` fixes exactly that ledger row without DDL.
5. codecamp cloudbuild fails before traffic shift when `doctor --check`
   fails.
6. `drizzle-kit generate` against an unchanged schema produces an empty/no-op
   diff (snapshot is current).
7. `node` can import `packages/db/dist/index.js` outside a bundler.
8. Missing `DATABASE_URL` in production runtime throws with an explicit
   message; privileged fallback to `DATABASE_URL` warns.
9. `sessions_user_id_idx` and `sessions_expires_at_idx` exist after
   migration; schema and migration agree.
10. No consumer imports seed data via the root barrel; `registerShutdownHandler`
    is gone.

## Out of Scope

- Timestamp timezone unification (`sessions` et al. are tz-naive while
  `audit_events` is tz-aware) — recorded in tech-debt; migrating column
  types on live data needs its own track.
- A real FK for `users.licenseId` (documented circular-import workaround) —
  needs orphan-row cleanup first.
- Folding legacy matviews into Drizzle migrations (existing tech-debt row,
  2026-05-23).
- drizzle-zod insert/select schema exports (existing tech-debt row,
  2026-05-23).
- Deploy gates for reading/primary/science apps (pattern documented; their
  pipelines are manual or out of scope here).
- The auth track's 0018 journal registration task remains valid — whichever
  track lands first registers it; the integrity test enforces the end state.
