# Plan: Webhook → LLM Review Reliability (Postgres-Backed Retry + DLQ)

> Contract-First + TDD. Postgres job table (no Redis). Runtime tests use the real test DB
> (queue claim / SKIP LOCKED / advisory behavior cannot be exercised on mock-db). Depends
> on `codecamp_review_ai_consolidation_20260605` (single review seam).

## Phase 0: Setup + Dependency Gate
- [ ] Task: Confirm `codecamp_review_ai_consolidation_20260605` has landed — `reviewExercise` is the single review seam taking an injected `AIClient`. If NOT, HALT and escalate (do not duplicate the wrapper).
- [ ] Task: `grep -rn` the current webhook review entrypoint + the fire-and-forget `.catch` site; record locations.
- [ ] Task: Read `lib/platform/session-cleanup.ts` (worker/scheduler + advisory-lock pattern) and the `connection_pooling` lessons (direct connection for `LISTEN/NOTIFY`/locks).
- [ ] Task: Identify whether codecamp tables are tenant-scoped (decide if `review_jobs` carries a tenant key).

## Phase 1: `review_jobs` Schema (Contract) — TDD
- [ ] Task: Write a schema/migration test (PgDialect render or migration-sql test) asserting the table, the `status` enum, the claim index (`status`, `next_attempt_at`), and the unique idempotency index on the PR key.
- [ ] Task: Add the `review_jobs` table to the schema package + barrel export.
- [ ] Task: Write the Drizzle migration (hand-write if no TTY; add journal entry).
- [ ] Task: Apply to `science_advantage_test` / codecamp test DB; verify it applies cleanly.
- [ ] Task: Verify — schema/migration tests green.

## Phase 2: Enqueue (Idempotent) — TDD
- [ ] Task: Write test: webhook enqueues exactly one `pending` job; a duplicate delivery for the same PR head does NOT create a second row; webhook returns 2xx promptly.
- [ ] Task: Write test: URL normalization preserved (trailing slash / `.git` still matches repo).
- [ ] Task: Implement `enqueueReviewJob` (idempotent upsert on PR key) and switch the webhook handler to enqueue instead of running inline.
- [ ] Task: Verify — `pnpm turbo run test --filter=@reading-advantage/webhooks` green.

## Phase 3: Worker Claim + Process + Settle — TDD
- [ ] Task: Write test: `claimDueJobs` uses `FOR UPDATE SKIP LOCKED LIMIT N`; two concurrent claims never return the same job.
- [ ] Task: Write test: success → `succeeded`, single PR comment, result persisted, `reviewedAt` stamped only on terminal.
- [ ] Task: Write test: failure → `attempts++`, `status='pending'`, `next_attempt_at` = jittered exponential backoff; after `max_attempts` → `dead` with `last_error`; review NOT marked reviewed.
- [ ] Task: Write test: a `claimed` job older than the visibility timeout is reclaimable.
- [ ] Task: Implement the worker: claim → `reviewExercise` (injected `AIClient` + stubbed GitHub client) → settle, with backoff + visibility-timeout reclaim. Use the direct connection for locks.
- [ ] Task: Register the worker in the scheduler (mirror cleanup-job); env-configurable backoff/timeout with safe defaults.
- [ ] Task: Verify — worker tests green.

## Phase 4: Dead-Letter Visibility + Replay — TDD
- [ ] Task: Write route test: `GET /api/admin/review-jobs?status=dead` is ADMIN-only, Zod-validated, returns dead jobs; non-admin → 403.
- [ ] Task: Write test: requeue endpoint resets a dead job to `pending`/`attempts=0`; the job then processes.
- [ ] Task: Implement the admin query + requeue endpoints.
- [ ] Task: Verify — DLQ route tests green.

## Phase 5: Pipeline Integration Tests (the missing coverage)
- [ ] Task: Happy path E2E: webhook → enqueue → worker → review(Mock) → comment(stub) → DB; assert persisted result + exactly one comment.
- [ ] Task: Retry-then-succeed: Mock throws on attempt 1–2, succeeds on 3; assert backoff timing and final `succeeded`.
- [ ] Task: Exhaust-to-dead: Mock always throws; assert `dead` after `max_attempts` and review NOT shown as reviewed.
- [ ] Task: Idempotent redelivery: duplicate webhook → no double enqueue, no double comment.
- [ ] Task: Concurrency: two workers, one job processed once (SKIP LOCKED).

## Phase 6: Acceptance
- [ ] Task: Run `scripts/codecamp-pr-e2e.sh` adapted to the queued path (Mock provider) end-to-end if feasible; otherwise document why the integration suite supersedes it.
- [ ] Task: `pnpm turbo run build --filter=codecamp-advantage` (server-only/bundle check).
- [ ] Task: All filtered gates: `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/webhooks --filter=@reading-advantage/domain --filter=@reading-advantage/db --filter=codecamp-advantage` exit 0.

## Phase 7: Closeout
- [ ] Task: Mark `measure/tech-debt.md` rows 2026-05-16 (retry/DLQ) and 2026-05-15 (no integration tests) **Resolved** with the resolving commit(s).
- [ ] Task: Add a lessons-learned entry: Postgres `FOR UPDATE SKIP LOCKED` job queue as the Redis-free reliability primitive; visibility-timeout reclaim; idempotent webhook enqueue.
- [ ] Task: Update `measure/tracks.md` (mark complete); move track dir to `measure/archive/`.
- [ ] Task: Commit with `git notes`.
