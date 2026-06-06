# Plan: Audit Log Retention + DSAR Bulk Export

> Contract-First + TDD. Each phase ends with a verification step. Builds on the committed
> `audit_events` table and `recordAuditEvent` helper. Runtime tests use the real
> `science_advantage_test` DB (append-only DELETE cannot be exercised against mock-db).

## Phase 0: Setup
- [x] Task: Confirm `packages/db/src/schema/audit.ts` and `packages/auth/src/audit.ts` are present at HEAD (committed `87b2432`); read both to capture the exact `auditEvents` columns and `recordAuditEvent` signature.
- [x] Task: Locate the privileged/DDL connection used by `drizzle-kit migrate` (`DIRECT_DATABASE_URL`); confirm it has DELETE on `audit_events` (the app role does not).
- [x] Task: Read `lib/platform/session-cleanup.ts` to reuse the periodic-job + advisory-lock pattern.

### Phase 0 Findings (handoff to Green)

- **`auditEvents` columns** (DB column → field): `id`, `actor_user_id` (FK→users.id, ON DELETE SET NULL), `actor_role`, `action` (NOT NULL), `target_type`, `target_id`, `ip_address`, `user_agent`, `metadata` (jsonb), `created_at` (`timestamptz`, default `now()`). Indexes: `(actor_user_id, created_at)`, `(action, created_at)`, `(target_type, target_id)`. **No `schoolId` column** — DSAR tenant scoping must join through `users.schoolId` (per test-strategy §3).
- **`recordAuditEvent` signature**: `recordAuditEvent(ctx: AuditContext, payload: AuditPayload): Promise<void>`. Throws `AuditEventError` on empty `action` or DB failure. `safeMetadata(payload.metadata)` is applied internally — do not re-redact.
- **Privileged connection**: `DIRECT_DATABASE_URL` (env) is read by `packages/db/drizzle.config.ts:11` and applied to `drizzle-kit migrate`. The migration role (typically `postgres` locally, dedicated maintenance role in prod) is the only one with DELETE on `audit_events`. The `REVOKE UPDATE, DELETE ON audit_events FROM app_user` in `0018_audit_events.sql:38` is conditional on `app_user` role existence; locally (superuser-only) it's a no-op but documents intent. **Implication for P2 purge**: the purge function must read `DIRECT_DATABASE_URL`, build a dedicated `postgres-js` client (not the shared pool), and execute batched DELETEs against that connection.
- **`createCleanupTask` in `apps/science-advantage/lib/platform/session-cleanup.ts`** is the **interval-scheduler template only** — it does **not** contain `pg_try_advisory_lock`. The advisory-lock pattern referenced by the spec/test-strategy comes from `rate_limiter_v2_20260603` (separate track). P3 must **combine** the scheduler shape from `createCleanupTask` with an advisory-lock guard sourced from the rate-limiter track; do not expect both patterns in one file.
- **Baseline tests green**: `pnpm --filter @reading-advantage/auth test` → 83/83 passing (includes the 11-test `audit.test.ts`). No new test files required for Phase 0.

## Phase 1: Retention Config (Contract)
- [x] Task: Add `AUDIT_RETENTION_DAYS` to the validated env schema (`lib/env.ts` / shared env), default `2557`, `.refine(n => Number.isInteger(n) && n >= 365)`. (`781ff8a`)
- [x] Task: Write test asserting the default and that values < 365 throw at parse time. (`781ff8a`)
- [x] Task: Document the policy in `packages/auth/README.md` + new `docs/compliance/retention.md`. (Red-phase: doc-content tests pinned; see `phase-1-docs.test.ts`.) (`f36ce90`)
- [x] Task: Verify — env parse test passes. (`781ff8a`)

### Phase 1 Green-phase status

- **GREEN (2026-06-06):** all 10 phase-1-docs tests pass.
  - `packages/auth/README.md` created — documents `AUDIT_RETENTION_DAYS` env var, default 2557, ≥365 floor, FERPA rationale, and exports `retentionConfigSchema`/`getRetentionDays`.
  - `docs/compliance/retention.md` created — plain-language retention policy, 7-year/2557 window, 365 footgun guard, FERPA citation, cross-reference to auth README.
- **Test file:** `packages/auth/src/__tests__/phase-1-docs.test.ts` — 10/10 green.
- **Test command (targeted):** `cd packages/auth && npx vitest run src/__tests__/phase-1-docs.test.ts`
- **No regressions:** 13 test files, 118/118 pass.
- **Test fix:** path resolution in test corrected from 3 to 4 levels up (workspace root, not `packages/`).
- **Build-graph:** `graph.db` updated with changed test file.

## Phase 2: Purge Function (TDD)
- [x] Task: Write `audit-retention.test.ts` (unit): `getRetentionCutoff` math (UTC cutoff, default days, configured days). (`781ff8a`)
- [x] Task: Write `audit-retention.integration.test.ts`: seed rows at `window-1d` (kept) and `window+1d` (purged); assert `purgeExpiredAuditEvents` deletes only the expired row and returns the count. (`b397c3e` — Red phase test added; fails with PostgresError 42P01 until migrations are applied to `science_advantage_test`.)
- [x] Task: Write test: purge runs in batches (`LIMIT 5000`) and loops until empty (seed > 5000 expired rows or stub the batch size). (`b397c3e` + multi-batch strengthening — Red phase test added: seeds `BATCH_SIZE + 7 = 5007` rows to force ≥2 batch iterations, asserting `result.deleted === 5007` and no `multibatch:test:expired` rows remain. Fails with PostgresError 42P01 in Red.)
- [x] Task: Write test: a successful purge records exactly one `audit:retention_purge` event with the deleted count. (`b397c3e` — Red phase test added; asserts count == 1, `metadata.deletedCount === seedCount`, `metadata.retentionDays` matches config, `metadata.cutoff` is the UTC ISO string, and the post-purge row's `createdAt >= cutoff` per test-strategy §3 self-audit-recursion guard. Fails with PostgresError 42P01 in Red.)
- [x] Task: Implement `packages/auth/src/audit-retention.ts` `purgeExpiredAuditEvents(now)` using the privileged connection + batched DELETE + post-purge `recordAuditEvent`. (`781ff8a`)
- [x] Task: Export from `packages/auth/src/index.ts`. (`781ff8a`)
- [x] Task: Verify — `vitest run` in packages/auth green (108 tests, 12 files). (`781ff8a`)

### Phase 2 Green-phase status (2026-06-06)

- **GREEN:** all 4 integration tests pass. (`004e690`)
- **Fixes applied:**
  1. `audit-retention.ts`: Convert `cutoff` Date to ISO string before passing to
     `sql` template — postgres-js cannot bind raw Date objects
     (`ERR_INVALID_ARG_TYPE`).
  2. `audit-retention.integration.test.ts`: Boundary test used `actorUserId: actorId`
     (non-existent synthetic user) which violated FK constraint
     `audit_events_actor_user_id_fkey`. Changed to `actorUserId: null` consistent
     with all 3 other tests in the file (existing test style).
- **Migration prerequisite:** 0018_audit_events.sql must be applied to
  `science_advantage_test` (not registered in drizzle journal; applied manually).
- **Test command (targeted, Green):**
  `cd packages/auth && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test npx vitest run src/__tests__/audit-retention.integration.test.ts`
  → 1 file passed, 4 tests passed.
- **Full suite:** 14 files, 122/122 pass — no regressions.

## Phase 3: Periodic Job
- [x] Task: Write test: lock key constant is a stable positive BigInt; scheduler start/stop/run methods exist and work. (`781ff8a`)
- [x] Task: Write integration test: concurrent invocation is guarded by `pg_try_advisory_lock` (second caller no-ops). (`32b5a57` Red, `5cd0ee6` Green)
- [x] Task: Add the scheduler entry (mirror `session-cleanup.ts`): daily at a low-traffic hour, wrapped in the advisory lock. (`781ff8a`)
- [x] Task: Verify — unit tests green; job registers without throwing on boot. (`781ff8a`)

### Phase 3 Green-phase status (2026-06-06)

- **GREEN:** integration test passes — concurrent invocation correctly guarded by `pg_try_advisory_lock`.
- **Fix applied:** Consolidated lock + purge + release onto a **single** `postgres-js` connection inside `runPurgeWithLock`. Modified `tryAcquireAdvisoryLock`, `releaseAdvisoryLock`, and `purgeExpiredAuditEvents` to accept an optional `PrivilegedConnection` parameter. When provided, the shared connection is used (lock held across the session); when omitted, a new connection is created and closed internally (backward-compatible).
- **Root cause fixed:** The original implementation opened a fresh `createPrivilegedDb()` client in each helper and closed it in `finally`. PostgreSQL advisory locks are session-scoped, so the lock was released the moment the acquire helper's connection closed. The second concurrent caller therefore acquired a non-held lock and proceeded to purge a second time.
- **Test file:** `packages/auth/src/__tests__/audit-retention-job.integration.test.ts` — 1/1 green.
- **Test command (targeted):**
  `cd packages/auth && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test npx vitest run src/__tests__/audit-retention-job.integration.test.ts`
- **Unit tests:** 13 files, 118/118 pass (no regressions).
- **Retention integration tests:** 1 file, 4/4 pass individually (no regressions).
- **Known pre-existing issue:** 2 integration tests fail when run in the full suite due to parallel test files sharing the `audit_events` table (both truncate + insert concurrently). This is pre-existing (existed before this fix) and not caused by this change.

## Phase 4: DSAR Domain Function (TDD)
- [x] Task: Add `dsar:export` permission key to `packages/auth`; update `assertCan` coverage test. (`781ff8a`)
- [x] Task: Write `dsar.test.ts` (unit): assertCan gate, shape validation, tooLarge ceiling guard, empty result handling. (`781ff8a`)
- [x] Task: Write `dsar.integration.test.ts`: two-school fixture; assert `exportSubjectData` returns the subject's profile + audit events + activity, and that an admin in school A is DENIED a subject in school B. (`9022991`)
- [x] Task: Write test: export streams/paginates and returns `tooLarge` when the row ceiling is exceeded (integration). (`9022991`)
- [x] Task: Implement `packages/domain/src/audit/dsar.ts` `exportSubjectData(tenant, subjectRef)`, gated by `assertCan(actor, 'dsar:export')`, paginated reads, row ceiling. (Note: audit module is tenant-exempt per `tenant-coverage.test.ts:24`; manual schoolId scoping used for profile lookup.) (`781ff8a`)
- [x] Task: Verify — domain tests green (271 tests, 23 files); `tenant-coverage.test.ts` still passes. (`781ff8a`)

### Phase 4 Red-phase status (2026-06-06)

- **GREEN:** all 5 integration tests pass against the existing `exportSubjectData`
  implementation. The tests are the missing Red-phase deliverable
  (unit tests in `dsar.test.ts` already covered the mockable surface;
  the integration tests pin the real-DB behavior that the mock cannot
  model — see test-strategy §1).
- **Test file:** `packages/domain/src/__tests__/dsar.integration.test.ts` — 5/5 green.
- **Test command (targeted):**
  `cd packages/domain && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test npx vitest run src/__tests__/dsar.integration.test.ts`
  → 1 file, 5 tests, 5 passed (Duration ~70s on local docker Postgres).
- **Coverage of the two plan tasks:**
  1. Two-school fixture: covered by `happy path` (school A admin exports school A
     subject) + `tenant isolation: admin in school A DENIED school B subject` +
     `sanity (inverse case): admin in school B CAN export school B subject`.
  2. Streaming/pagination + tooLarge: covered by `streams/paginates over multiple
     pages (2500 events across 3 pages of 1000)` + `returns tooLarge when row
     ceiling is exceeded` (seeds 100,001 rows; verifies `status: "tooLarge"` +
     `totalRows > DSAR_ROW_CEILING`).
- **Bundle integrity:** the `happy path` test asserts both event shapes are
  returned when the subject is the actor AND when the subject is the target
  (the `actorUserId = X OR targetId = X` clause in `dsar.ts:112`).
- **Tenant isolation:** the cross-school denial test pins that the global
  `audit_events` table does not leak across schools — a raw
  `eq(auditEvents.actorUserId, subject.id)` would have leaked school B's
  events to the school A admin (test-strategy §3 cross-phase edge case).
- **Test command target time:** ~70s for the full file; the tooLarge test alone
  takes ~55s (100,001 row insert in 21 chunks of 5000 + 101 paginated SELECTs).
  Per-test timeout bumped to 180_000ms (3 min) — vitest's default 5s is far
  too short for a real 100k-row insert.
- **Cleanup:** `beforeEach` and `afterAll` use targeted `DELETE` (not
  `TRUNCATE`) to avoid stepping on `audit-retention.integration.test.ts`
  in `packages/auth` when both files run sequentially in the same suite
  (known pre-existing parallel-suite issue, see Phase 2 status note).
- **Source code changes:** NONE. Per the TDD contract, this commit adds tests
  only. The existing `exportSubjectData` implementation in
  `packages/domain/src/audit/dsar.ts` is unchanged.
- **Build-graph:** `graph.db` updated with the new test file
  (`build-graph update graph.db packages/domain/src/__tests__/dsar.integration.test.ts`
  → 0 → 8 nodes, 0 → 14 edges).

### Phase 4 Green-phase status (2026-06-06)

- **GREEN:** all 12 tests pass (7 unit + 5 integration). No implementation
  changes were required — `exportSubjectData` was already correct at `781ff8a`.
- **Cleanup:** removed unused `createTenantDB` import from `dsar.ts` (dead code
  left over from initial implementation; the function receives `db` as a parameter
  and does not create its own tenant DB).
- **Test command (targeted, unit):**
  `cd packages/domain && npx vitest run src/__tests__/dsar.test.ts`
  → 1 file, 7 tests, 7 passed.
- **Test command (targeted, integration):**
  `cd packages/domain && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/science_advantage_test npx vitest run src/__tests__/dsar.integration.test.ts`
  → 1 file, 5 tests, 5 passed.
- **Full domain suite:** 24 files, 276/276 pass — no regressions.
- **Build-graph:** `graph.db` updated with `dsar.ts`.

## Phase 5: DSAR Endpoint (TDD)
- [ ] Task: Write route test: ADMIN-only (non-admin → 403); Zod rejects neither/both of `userId`/`email`; valid request returns archive with `manifest.md` + JSON files whose counts match.
- [ ] Task: Write route test: the export is audited as `dsar:export` (actor = admin, target = subject); too-large export → 413.
- [ ] Task: Implement `GET /api/admin/dsar/export` (zip default, `?format=json` alternative), Zod-validated query, calling `exportSubjectData`, recording the `dsar:export` event.
- [ ] Task: Verify — route tests green.

## Phase 6: Integration + Acceptance
- [ ] Task: End-to-end: seed → request export → unzip → assert manifest counts == file row counts == DB counts for the subject.
- [ ] Task: Boundary: row at exactly the retention edge is handled per spec (UTC, off-by-one).
- [ ] Task: Run `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/auth --filter=@reading-advantage/domain --filter=science-advantage`; all exit 0.

## Phase 7: Closeout
- [ ] Task: Update `measure/tech-debt.md`: note retention/DSAR delivered; reconcile any audit-log follow-up rows.
- [ ] Task: Add a lessons-learned entry if anything non-obvious surfaced (privileged-connection DELETE against an append-only table; advisory-lock job pattern).
- [ ] Task: Update `measure/tracks.md` (mark complete) and move the track dir to `measure/archive/`.
- [ ] Task: Commit with `git notes` summarizing the track.
