# Plan: Audit Log Retention + DSAR Bulk Export

> Contract-First + TDD. Each phase ends with a verification step. Builds on the committed
> `audit_events` table and `recordAuditEvent` helper. Runtime tests use the real
> `science_advantage_test` DB (append-only DELETE cannot be exercised against mock-db).

## Phase 0: Setup
- [ ] Task: Confirm `packages/db/src/schema/audit.ts` and `packages/auth/src/audit.ts` are present at HEAD (committed `87b2432`); read both to capture the exact `auditEvents` columns and `recordAuditEvent` signature.
- [ ] Task: Locate the privileged/DDL connection used by `drizzle-kit migrate` (`DIRECT_DATABASE_URL`); confirm it has DELETE on `audit_events` (the app role does not).
- [ ] Task: Read `lib/platform/session-cleanup.ts` to reuse the periodic-job + advisory-lock pattern.

## Phase 1: Retention Config (Contract)
- [ ] Task: Add `AUDIT_RETENTION_DAYS` to the validated env schema (`lib/env.ts` / shared env), default `2557`, `.refine(n => Number.isInteger(n) && n >= 365)`.
- [ ] Task: Write test asserting the default and that values < 365 throw at parse time.
- [ ] Task: Document the policy in `packages/auth/README.md` + new `docs/compliance/retention.md`.
- [ ] Task: Verify — env parse test passes.

## Phase 2: Purge Function (TDD)
- [ ] Task: Write `audit-retention.test.ts` (integration): seed rows at `window-1d` (kept) and `window+1d` (purged); assert `purgeExpiredAuditEvents` deletes only the expired row and returns the count.
- [ ] Task: Write test: purge runs in batches (`LIMIT 5000`) and loops until empty (seed > 5000 expired rows or stub the batch size).
- [ ] Task: Write test: a successful purge records exactly one `audit:retention_purge` event with the deleted count.
- [ ] Task: Implement `packages/auth/src/audit-retention.ts` `purgeExpiredAuditEvents(now)` using the privileged connection + batched DELETE + post-purge `recordAuditEvent`.
- [ ] Task: Export from `packages/auth/src/index.ts`.
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/auth` green.

## Phase 3: Periodic Job
- [ ] Task: Write test: concurrent invocation is guarded by `pg_try_advisory_lock` (second caller no-ops).
- [ ] Task: Add the scheduler entry (mirror `session-cleanup.ts`): daily at a low-traffic hour, wrapped in the advisory lock.
- [ ] Task: Verify — advisory-lock test green; job registers without throwing on boot.

## Phase 4: DSAR Domain Function (TDD)
- [ ] Task: Add `dsar:export` permission key to `packages/auth`; update `assertCan` coverage test.
- [ ] Task: Write `dsar.test.ts` (integration): two-school fixture; assert `exportSubjectData` returns the subject's profile + audit events + activity, and that an admin in school A is DENIED a subject in school B.
- [ ] Task: Write test: export streams/paginates and returns `tooLarge` when the row ceiling is exceeded.
- [ ] Task: Implement `packages/domain/src/audit/dsar.ts` `exportSubjectData(tenant, subjectRef)` via `createTenantDB`, gated by `assertCan(actor, 'dsar:export')`, paginated reads, row ceiling.
- [ ] Task: Verify — domain DSAR tests green; `tenant-coverage.test.ts` still passes (function uses `createTenantDB`).

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
