# Specification: Webhook → LLM Review Reliability (Postgres-Backed Retry + DLQ)

## Overview

The codecamp-advantage PR-review pipeline is **fire-and-forget**: a GitHub webhook
triggers an async LLM review that posts a PR comment and writes the result to the DB. On a
transient failure (LLM timeout, GitHub API blip) the review is marked "reviewed" with an
error note and **never retried**, and the whole pipeline has **no integration test**. This
track makes the pipeline durable with a Postgres-backed job queue (bounded retries +
dead-letter state) and adds the missing end-to-end tests.

## Problem

Two open `tech-debt.md` rows:

- **2026-05-16 (`codecamp_exercise_repos`, Medium):** "Webhook async LLM review pipeline
  has no retry or dead-letter queue. Error handling marks review as 'reviewed' with an
  error note, but transient failures are not retried."
- **2026-05-15 (`codecamp_review`, Medium):** "No integration tests for webhook → LLM →
  comment → DB pipeline. Fire-and-forget async pattern untested."

Both were deferred "to an infra track requiring BullMQ/Redis." This track **rejects the
Redis assumption**: the monorepo has standardized on Postgres-backed primitives
(`rate_limiter_v2` uses a Postgres table + advisory locks; `connection_pooling` and the
`reactive_query_layer` stub commit to `LISTEN/NOTIFY`). A Postgres job table is the
consistent, lower-operational-cost choice and needs no new infrastructure.

## Why

- A review silently lost to a transient blip means an intern's PR never gets feedback —
  the core value of codecamp.
- "Marked reviewed on failure" is actively misleading: the dashboard shows a review that
  doesn't exist.
- An untested fire-and-forget path is where regressions hide; the lessons-learned file
  already warns streaming/async review handling is subtle.

## Functional Requirements

### FR-1: `review_jobs` Table
- Add a Postgres table (in the appropriate schema package) capturing: `id`, the PR/repo
  identifiers and payload needed to (re)run a review, `status`
  (`pending|claimed|succeeded|failed|dead`), `attempts`, `max_attempts` (default 5),
  `next_attempt_at`, `last_error`, `claimed_at`, `claimed_by`, timestamps, and tenant key
  if the codecamp tables are tenant-scoped.
- Indexes for the claim query (`status`, `next_attempt_at`) and idempotency
  (unique on the natural PR key so a redelivered webhook does not double-enqueue).
- Drizzle migration (hand-written if `drizzle-kit generate` needs a TTY, per
  lessons-learned).

### FR-2: Enqueue on Webhook (Idempotent)
- The GitHub webhook handler **enqueues a `review_jobs` row** instead of running the review
  inline. Enqueue is idempotent on the PR key (redelivery / GitHub retries do not create
  duplicates; an in-flight or terminal job for the same PR head is reused or supersedes).
- Webhook responds 2xx immediately after enqueue (GitHub's timeout budget is small).
- URL normalization (trailing slash / `.git`) preserved per lessons-learned
  (2026-05-14) so repo matching still works.

### FR-3: Worker (Claim → Process → Settle)
- A worker claims due jobs with `UPDATE ... SET status='claimed' ... WHERE id IN (SELECT
  ... WHERE status='pending' AND next_attempt_at <= now() FOR UPDATE SKIP LOCKED LIMIT N)`
  — the standard Postgres queue claim (safe across replicas).
- Processes via the **single** `reviewExercise` seam (from
  `codecamp_review_ai_consolidation_20260605`): run review → post PR comment → write result.
- On success: `status='succeeded'`; stamp `reviewedAt` only when terminal (lessons-learned
  2026-05-15).
- On failure: increment `attempts`; if `attempts < max_attempts`, set `status='pending'`
  with exponential backoff (`next_attempt_at = now() + base * 2^attempts`, jittered); else
  `status='dead'` (dead-letter) with `last_error`.
- A stuck `claimed` job (claimed_at older than a visibility timeout) is reclaimable.

### FR-4: Dead-Letter Visibility + Replay
- Dead jobs are queryable by admins (extend the existing admin reporting surface or add a
  minimal `GET /api/admin/review-jobs?status=dead`, ADMIN-only, Zod-validated).
- An admin can requeue a dead job (`status='pending'`, `attempts=0`) — manual replay.
- A dead-lettered review is **not** shown as "reviewed" anywhere; status is distinct.

### FR-5: Pipeline Integration Tests (the missing coverage)
- End-to-end against the real test DB + Mock `AIClient` + a stubbed GitHub client:
  webhook → enqueue → worker → review → comment(stub) → DB, asserting the persisted result
  and a single PR comment.
- Failure path: Mock provider throws → job retried with backoff → succeeds on attempt k.
- Exhaustion path: persistent failure → job goes `dead` after `max_attempts`; review is
  NOT marked reviewed.
- Idempotency: duplicate webhook delivery does not double-enqueue or double-comment.
- Concurrency: two workers, `SKIP LOCKED` ensures a job is processed once.

## Non-Functional Requirements
- No new infrastructure (no Redis/BullMQ). Worker runs in the existing Node process /
  scheduler (mirror the cleanup-job pattern) or as a separate entrypoint.
- Backoff + visibility timeout are env-configurable with safe defaults.
- Uses `DIRECT_DATABASE_URL` semantics where `LISTEN/NOTIFY` or advisory locks are
  involved (pooler caveat from `connection_pooling` lessons-learned).
- `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/webhooks
  --filter=@reading-advantage/domain --filter=@reading-advantage/db --filter=codecamp-advantage`
  exits 0.

## Acceptance Criteria
1. `review_jobs` table + migration + idempotency/claim indexes exist.
2. Webhook enqueues (idempotent on PR key) and returns 2xx promptly; no inline review.
3. Worker claims with `FOR UPDATE SKIP LOCKED`, processes via `reviewExercise`, settles
   success/retry/dead with jittered exponential backoff.
4. Stuck `claimed` jobs are reclaimable after the visibility timeout.
5. Dead jobs are admin-queryable and replayable; never surfaced as "reviewed".
6. Integration tests cover: happy path, retry-then-succeed, exhaust-to-dead,
   idempotent redelivery, two-worker single-processing.
7. `reviewedAt` terminal-stamping preserved.
8. No new external infra; quality gates green for the four filtered packages/app.

## Out of Scope
- Replacing the queue with Redis/BullMQ (explicitly rejected).
- A rich admin DLQ **UI** beyond the minimal endpoint (follow-up).
- Real-time push of job status to the dashboard — soft-relates to the reactive query
  layer; this track is poll/query-based.
- Reliability for non-review webhooks.
- The review *content*/model (owned by `codecamp_review_ai_consolidation_20260605`).

## Constraints & Risks
- **Risk: double-commenting on retry.** Mitigation: idempotency on PR key + check for an
  existing bot comment before posting, or update-in-place; covered by the idempotency test.
- **Risk: worker contention / lost jobs across replicas.** Mitigation: `FOR UPDATE SKIP
  LOCKED` claim + visibility-timeout reclaim; concurrency test.
- **Risk: transaction-mode pooler breaks `LISTEN/NOTIFY`/advisory locks.** Mitigation: use
  the direct connection for those paths (lessons-learned 2026-05-25).
- **Risk: build ordering** — this track assumes ONE review impl. Mitigation: depends on
  `codecamp_review_ai_consolidation_20260605`; if that has not landed, Phase 0 halts and
  the dependency is escalated rather than duplicating the wrapper.

## References
- `measure/tech-debt.md` rows 2026-05-16 (retry/DLQ) + 2026-05-15 (no integration tests)
- `measure/tracks/codecamp_review_ai_consolidation_20260605/` (the single review seam)
- `measure/tracks/rate_limiter_v2_20260603/` (Postgres-backed primitive + advisory-lock pattern)
- `measure/archive/connection_pooling_20260522/` + lessons-learned 2026-05-25 (pooler/`LISTEN/NOTIFY`)
- `measure/tracks/reactive_query_layer_20260522/` (LISTEN/NOTIFY direction)
- lessons-learned 2026-05-14 (webhook URL normalization), 2026-05-15 (`reviewedAt` terminal stamping)
- `scripts/codecamp-pr-e2e.sh` (existing E2E harness)
