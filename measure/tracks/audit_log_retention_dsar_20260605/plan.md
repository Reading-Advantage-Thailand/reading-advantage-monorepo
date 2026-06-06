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
- [~] Task: Document the policy in `packages/auth/README.md` + new `docs/compliance/retention.md`. (Red-phase: doc-content tests pinned; see `phase-1-docs.test.ts`.)
- [x] Task: Verify — env parse test passes. (`781ff8a`)

### Phase 1 Red-phase state (handoff to Green)

- **Test file (new):** `packages/auth/src/__tests__/phase-1-docs.test.ts` — 10 tests
  pinning the FR-1 doc surface. Mirrors the prior track's
  `phase-9-docs.test.ts` convention (runtime `readFileSync` + content
  assertions; no DB / no network).
- **RED (2026-06-06):** all 10 tests fail because neither doc exists
  yet. 5 fail on the auth README (file-exists, AUDIT_RETENTION_DAYS
  name, default 2557, refine 365, export references) and 5 fail on
  the compliance doc (file-exists, 7-year / 2557 window, 365 floor,
  FERPA citation, cross-reference to the auth README).
- **Test command (targeted):**
  `cd packages/auth && npx vitest run src/__tests__/phase-1-docs.test.ts`
- **No regressions:** the 12 pre-existing auth test files still
  pass (108/108); the new file is the only failure in the run.
- **Green-phase TODO for the implementer:** create both files. The
  test contract pins the exact signals that must appear, so the
  implementer can write the docs against the assertions and turn
  the suite green without re-deriving the contract.
- **Build-graph:** `graph.db` updated with the new test file
  (commit `aff01d7`) so the next agent sees it in the index.

## Phase 2: Purge Function (TDD)
- [x] Task: Write `audit-retention.test.ts` (unit): `getRetentionCutoff` math (UTC cutoff, default days, configured days). (`781ff8a`)
- [ ] Task: Write `audit-retention.integration.test.ts`: seed rows at `window-1d` (kept) and `window+1d` (purged); assert `purgeExpiredAuditEvents` deletes only the expired row and returns the count.
- [ ] Task: Write test: purge runs in batches (`LIMIT 5000`) and loops until empty (seed > 5000 expired rows or stub the batch size).
- [ ] Task: Write test: a successful purge records exactly one `audit:retention_purge` event with the deleted count.
- [x] Task: Implement `packages/auth/src/audit-retention.ts` `purgeExpiredAuditEvents(now)` using the privileged connection + batched DELETE + post-purge `recordAuditEvent`. (`781ff8a`)
- [x] Task: Export from `packages/auth/src/index.ts`. (`781ff8a`)
- [x] Task: Verify — `vitest run` in packages/auth green (108 tests, 12 files). (`781ff8a`)

## Phase 3: Periodic Job
- [x] Task: Write test: lock key constant is a stable positive BigInt; scheduler start/stop/run methods exist and work. (`781ff8a`)
- [ ] Task: Write integration test: concurrent invocation is guarded by `pg_try_advisory_lock` (second caller no-ops).
- [x] Task: Add the scheduler entry (mirror `session-cleanup.ts`): daily at a low-traffic hour, wrapped in the advisory lock. (`781ff8a`)
- [x] Task: Verify — unit tests green; job registers without throwing on boot. (`781ff8a`)

## Phase 4: DSAR Domain Function (TDD)
- [x] Task: Add `dsar:export` permission key to `packages/auth`; update `assertCan` coverage test. (`781ff8a`)
- [x] Task: Write `dsar.test.ts` (unit): assertCan gate, shape validation, tooLarge ceiling guard, empty result handling. (`781ff8a`)
- [ ] Task: Write `dsar.integration.test.ts`: two-school fixture; assert `exportSubjectData` returns the subject's profile + audit events + activity, and that an admin in school A is DENIED a subject in school B.
- [ ] Task: Write test: export streams/paginates and returns `tooLarge` when the row ceiling is exceeded (integration).
- [x] Task: Implement `packages/domain/src/audit/dsar.ts` `exportSubjectData(tenant, subjectRef)`, gated by `assertCan(actor, 'dsar:export')`, paginated reads, row ceiling. (Note: audit module is tenant-exempt per `tenant-coverage.test.ts:24`; manual schoolId scoping used for profile lookup.) (`781ff8a`)
- [x] Task: Verify — domain tests green (271 tests, 23 files); `tenant-coverage.test.ts` still passes. (`781ff8a`)

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
