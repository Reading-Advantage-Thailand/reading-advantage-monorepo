# Plan: Webhook → LLM Review Reliability (Postgres-Backed Retry + DLQ)

> Contract-First + TDD. Postgres job table (no Redis). Runtime tests use the real test DB
> (queue claim / SKIP LOCKED / advisory behavior cannot be exercised on mock-db). Depends
> on `codecamp_review_ai_consolidation_20260605` (single review seam).

## Phase 0: Setup + Dependency Gate
- [~] Task: Confirm `codecamp_review_ai_consolidation_20260605` has landed — `reviewExercise` is the single review seam taking an injected `AIClient`. If NOT, HALT and escalate (do not duplicate the wrapper).
- [~] Task: `grep -rn` the current webhook review entrypoint + the fire-and-forget `.catch` site; record locations.
- [~] Task: Read `lib/platform/session-cleanup.ts` (worker/scheduler + advisory-lock pattern) and the `connection_pooling` lessons (direct connection for `LISTEN/NOTIFY`/locks).
- [~] Task: Identify whether codecamp tables are tenant-scoped (decide if `review_jobs` carries a tenant key).

## Phase 1: `review_jobs` Schema (Contract) — TDD
- [~] Task: Write a schema/migration test (PgDialect render or migration-sql test) asserting the table, the `status` enum, the claim index (`status`, `next_attempt_at`), and the unique idempotency index on the PR key.
- [~] Task: Add the `review_jobs` table to the schema package + barrel export.
- [~] Task: Write the Drizzle migration (hand-write if no TTY; add journal entry).
- [~] Task: Apply to `science_advantage_test` / codecamp test DB; verify it applies cleanly.
- [~] Task: Verify — schema/migration tests green.

## Phase 2: Enqueue (Idempotent) — TDD
- [~] Task: Write test: webhook enqueues exactly one `pending` job; a duplicate delivery for the same PR head does NOT create a second row; webhook returns 2xx promptly.
- [~] Task: Write test: URL normalization preserved (trailing slash / `.git` still matches repo).
- [~] Task: Implement `enqueueReviewJob` (idempotent upsert on PR key) and switch the webhook handler to enqueue instead of running inline.
- [~] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/webhooks` green.

## Phase 3: Worker Claim + Process + Settle — TDD
- [~] Task: Write test: `claimDueJobs` uses `FOR UPDATE SKIP LOCKED LIMIT N`; two concurrent claims never return the same job.
- [~] Task: Write test: success → `succeeded`, single PR comment, result persisted, `reviewedAt` stamped only on terminal.
- [~] Task: Write test: failure → `attempts++`, `status='pending'`, `next_attempt_at` = jittered exponential backoff; after `max_attempts` → `dead` with `last_error`; review NOT marked reviewed.
- [~] Task: Write test: a `claimed` job older than the visibility timeout is reclaimable.
- [~] Task: Implement the worker: claim → `reviewExercise` (injected `AIClient` + stubbed GitHub client) → settle, with backoff + visibility-timeout reclaim. Use the direct connection for locks.
- [~] Task: Register the worker in the scheduler (mirror cleanup-job); env-configurable backoff/timeout with safe defaults.
- [~] Task: Verify — worker tests green.

## Phase 4: Dead-Letter Visibility + Replay — TDD
- [~] Task: Write route test: `GET /api/admin/review-jobs?status=dead` is ADMIN-only, Zod-validated, returns dead jobs; non-admin → 403.
- [~] Task: Write test: requeue endpoint resets a dead job to `pending`/`attempts=0`; the job then processes.
- [~] Task: Implement the admin query + requeue endpoints.
- [~] Task: Verify — DLQ route tests green.

## Phase 5: Pipeline Integration Tests (the missing coverage)
- [~] Task: Happy path E2E: webhook → enqueue → worker → review(Mock) → comment(stub) → DB; assert persisted result + exactly one comment.
- [~] Task: Retry-then-succeed: Mock throws on attempt 1–2, succeeds on 3; assert backoff timing and final `succeeded`.
- [~] Task: Exhaust-to-dead: Mock always throws; assert `dead` after `max_attempts` and review NOT shown as reviewed.
- [~] Task: Idempotent redelivery: duplicate webhook → no double enqueue, no double comment.
- [~] Task: Concurrency: two workers, one job processed once (SKIP LOCKED).

## Phase 6: Acceptance
- [~] Task: Run `scripts/codecamp-pr-e2e.sh` adapted to the queued path (Mock provider) end-to-end if feasible; otherwise document why the integration suite supersedes it.
- [~] Task: `pnpm turbo run build --filter=codecamp-advantage` (server-only/bundle check).
- [~] Task: All filtered gates: `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain --filter=@reading-advantage/db --filter=codecamp-advantage` exit 0.

## Phase 7: Closeout
- [~] Task: Mark `measure/tech-debt.md` rows 2026-05-16 (retry/DLQ) and 2026-05-15 (no integration tests) **Resolved** with the resolving commit(s).
- [~] Task: Add a lessons-learned entry: Postgres `FOR UPDATE SKIP LOCKED` job queue as the Redis-free reliability primitive; visibility-timeout reclaim; idempotent webhook enqueue.
- [~] Task: Update `measure/tracks.md` (mark complete); move track dir to `measure/archive/`.
- [~] Task: Commit with `git notes`.

---

## Red Phase Evidence (2026-07-04)

All Phase 0–5 RED test files have been written and run against baseline `1cf01b83`. The failures are intentionally RED because the source implementations (`review_jobs` schema, `review-worker.ts`, `enqueueReviewJob`, tRPC admin procedures) do not exist yet.

### Phase 1 — schema + migration
```bash
pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/phase-1-review-jobs-schema.test.ts \
  src/__tests__/phase-1-review-jobs-migration.test.ts
```
Result: 4 failed tests + 1 suite error.
- `reviewJobs` is undefined (not exported from schema).
- `codecampReviewJobStatusEnum` is undefined.
- `drizzle/0025_review_jobs.sql` does not exist (ENOENT).

### Phase 2 — enqueue idempotency + webhook ACK
```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-2-enqueue-idempotent.test.ts \
  src/__tests__/phase-2-enqueue-url-normalization.test.ts \
  src/__tests__/phase-2-webhook-acks-after-enqueue.test.ts
```
Result: 3 failed suites; 2 assertion failures + 2 module-not-found errors.
- `../review-worker.js` module not found (2 files).
- `enqueueReviewJob` call count is 0 in the webhook handler (handler still does inline review).
- `reviewExercise` is called inline 1 time in the handler.

### Phase 3 — worker claim/settle/reclaim
```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-3-claim-skip-locked.test.ts \
  src/__tests__/phase-3-success-settle.test.ts \
  src/__tests__/phase-3-retry-backoff.test.ts \
  src/__tests__/phase-3-exhaust-to-dead.test.ts \
  src/__tests__/phase-3-reclaim-stuck.test.ts
```
Result: 5 failed suites, all with `Cannot find module '../review-worker.js'`.

### Phase 4 — admin DLQ
```bash
pnpm --filter @reading-advantage/api exec vitest run \
  src/__tests__/phase-4-admin-list-dead-review-jobs.test.ts \
  src/__tests__/phase-4-admin-requeue-review-job.test.ts
```
Result: 2 failed files, 4 failed tests.
- `No procedure found on path "codecamp,listDeadReviewJobs"`.
- `No procedure found on path "codecamp,requeueReviewJob"`.
- Non-admin callers receive `NOT_FOUND` instead of `FORBIDDEN` because the procedures do not exist.

### Phase 5 — integration pipeline
```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-5-happy-path.test.ts \
  src/__tests__/phase-5-retry-then-succeed.test.ts \
  src/__tests__/phase-5-exhaust-to-dead.test.ts \
  src/__tests__/phase-5-idempotent-redelivery.test.ts \
  src/__tests__/phase-5-concurrency.test.ts
```
Result: 5 failed suites, all with `Cannot find module '../review-worker.js'`.

### Changed-contract rewrite
`packages/webhooks/src/__tests__/phase-6-acceptance.test.ts` lines 403–459 were rewritten to assert the new enqueue-then-ACK contract. Running the file now yields:
- 4 passed (including the original full-flow test and artifact tests)
- 2 failed (the two rewritten fire-and-forget-posture tests) because `enqueueReviewJob` is not yet wired into `github.ts`.

### Aggregate webhooks suite
```bash
pnpm --filter @reading-advantage/webhooks exec vitest run
```
Result: `14 failed | 7 passed` files; `4 failed | 81 passed` tests. This is the expected intentionally-red aggregate state per §0.10 of the test strategy.

---

## Notes for Jr-Green

1. **Start with Phase 1** (`packages/db/src/schema/codecamp.ts` + `drizzle/0025_review_jobs.sql`). The schema test expects `reviewJobs` + `codecampReviewJobStatusEnum` exported; the migration test expects `0025_review_jobs.sql` and a `_journal.json` entry at index 25.
2. **Classify `reviewJobs` as `REFERENTIAL`** in `packages/domain/src/tenant-registry.ts` (no `schoolId`; codecamp is single-tenant/global). `tenant-coverage.test.ts` is the gate.
3. **Create `packages/webhooks/src/review-worker.ts`** exporting: `enqueueReviewJob`, `normalizePrKey`, `claimDueJobs`, `processJob`, `settleJob`, `reclaimStuckJobs`, `createReviewWorker`.
4. **Update `packages/webhooks/src/github.ts`** to call `enqueueReviewJob` and remove the inline `runReview` closure / `backgroundReviewJobs` Map / `waitForBackgroundReviews` export.
5. **Add tRPC admin procedures** `listDeadReviewJobs` and `requeueReviewJob` to `packages/api/src/routers/codecamp.ts`, backed by domain functions or inline queries.
6. **Use `createPrivilegedDb()`** (DIRECT_DATABASE_URL) for `claimDueJobs` so `FOR UPDATE SKIP LOCKED` works across replicas.
7. **Do NOT call `updatePrReview({ reviewStatus: 'reviewed' })` on failure/dead.** The review row must stay `pending`; DLQ state lives only on `review_jobs.status`.
8. **Gate the worker auto-start** with `REVIEW_WORKER_ENABLED` so tests can manually call `createReviewWorker({ intervalMs }).run()` without racing a background loop.
