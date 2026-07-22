# Task 2 Current `review_jobs` Inventory — 2026-07-22

## Decision

**PASS for Task 2's inventory/characterization contract.** The current queue is
now documented with executable characterization evidence. This does not accept
Phase 1, generic job contracts, a new schema, a migration, or any Task 3+
strengthening.

The code graph could not supply current structural evidence: `graph.db` is dated
2026-07-15 and the current `repo-graph search` failed against its older schema
with `no such column: documentation`. Source inspection followed the required
graph-first attempt.

## Current ownership and data contract

- `packages/db/src/schema/codecamp.ts:11-29` defines all five states:
  `pending|claimed|succeeded|failed|dead`.
- `packages/db/src/schema/codecamp.ts:308-359` owns the Drizzle table, natural
  PR-key uniqueness, and `(status,next_attempt_at)` claim index.
- `packages/db/drizzle/0025_review_jobs.sql:7-30` is the applied table/index
  migration. No migration or schema change is part of Task 2.
- `packages/types/src/codecamp.ts:306-344` defines the admin-facing Zod row and
  input contracts. Large `payload_json` and `delivery_id` values are not in the
  admin output schema.
- `packages/domain/src/tenant-registry.ts:284-287` classifies `reviewJobs` as
  `REFERENTIAL`. The present rationale is Codecamp's global/single-tenant
  context with no `schoolId`; domain access uses an auditable `unscoped()`
  reason at `packages/domain/src/codecamp/review-jobs.ts:75-78,141-144`.
- `packages/architecture-enforcement/src/config/ownership-map.v1.json:58-93`
  declares the target ownership roots as database schema, migrations, and the
  exact PostgreSQL job adapter. The current legacy webhooks/domain accesses are
  pre-existing baseline to adapt; Task 2 adds no database access and does not
  grow that baseline.

## Enqueue and webhook acknowledgement

- `packages/webhooks/src/review-worker.ts:144-171` normalizes GitHub PR URLs to
  lowercase owner/repo, strips `.git`, and validates a positive pull number.
- `packages/webhooks/src/review-worker.ts:272-369` enqueues idempotently on the
  normalized natural key. The durable layer is the unique index plus
  `onConflictDoUpdate`; the process-local `Set` is only a fast path.
- The conflict update at `packages/webhooks/src/review-worker.ts:328-343`
  resets every existing row, including `claimed`, to `pending` and clears claim
  metadata. This is current behavior, not a lease-safe guarantee.
- `packages/webhooks/src/github.ts:295-341` awaits enqueue, schedules a worker
  tick with `setImmediate`, and then returns HTTP 200. Enqueue failure is logged
  and still returns 200, so the current ACK contract is low latency but not a
  fail-closed proof that a durable row exists.
- `packages/webhooks/src/github.ts:82-95` also deduplicates by delivery ID in
  process. The durable job uniqueness key remains PR owner/repo/number rather
  than the delivery ID.

## Claim, reclaim, retry, and processing

- `packages/webhooks/src/review-worker.ts:469-518` claims bounded due rows in a
  single parameterized `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP
  LOCKED LIMIT ...) RETURNING` statement.
- `packages/webhooks/src/review-worker.ts:537-583` reclaims timed-out `claimed`
  rows by resetting them to `pending` and clearing `claimed_at/claimed_by`.
- `packages/webhooks/src/review-worker.ts:878-939` settles success to
  `succeeded`, transient errors to `pending` with jittered exponential backoff,
  and exhaustion to `dead`.
- Although `failed` is a valid schema/admin state, the current settle function
  does not emit it; it is representable and replayable but not a worker settle
  transition.
- `packages/webhooks/src/review-worker.ts:1012-1059` reclaims, drains bounded
  batches for at most 100 iterations, processes each claimed row sequentially,
  and treats reclaim/settle failures as non-fatal for the tick.
- `packages/webhooks/src/review-worker.ts:680-824` runs the existing Codecamp PR
  review logic. This business behavior remains in the current webhooks worker;
  Task 2 does not move or rewrite it.

## Environment and process controls

- Import-time controls at `packages/webhooks/src/review-worker.ts:73-127`:
  `REVIEW_WORKER_BATCH_SIZE` (5),
  `REVIEW_WORKER_VISIBILITY_TIMEOUT_MS` (15 minutes),
  `REVIEW_WORKER_BACKOFF_BASE_MS` (1000 ms),
  `REVIEW_WORKER_MAX_ATTEMPTS` (5), and
  `REVIEW_WORKER_MAX_JITTER_MS` (20 percent of the base).
- `packages/webhooks/src/review-worker.ts:1071-1103` provides an idempotent
  scheduler with a 30-second default interval; start requires
  `REVIEW_WORKER_ENABLED=1` or `NODE_ENV=production`.
- Contrary to the 2026-07-04 historical acceptance note, the scheduler is now
  wired: `packages/webhooks/src/index.ts:18-20` creates and starts it.
- `packages/webhooks/src/review-worker.ts:50-61,477-516,550-582` creates a
  privileged DB connection for claim/reclaim when a DB is not injected.
  `packages/db/src/privileged.ts:7-36` prefers `DIRECT_DATABASE_URL`, but warns
  and falls back to `DATABASE_URL`. The 2026-07-22 verification environment had
  no `DIRECT_DATABASE_URL`, so live locking tests remained skipped.
- The current webhooks bootstrap has no signal/drain wiring. Graceful shutdown
  belongs to the future worker-platform phases, not Task 2.

## Admin list/replay, authorization, and audit

- `packages/api/src/routers/codecamp.ts:596-626` exposes both operations through
  `adminProcedure` with Zod input/output validation.
- `packages/domain/src/codecamp/review-jobs.ts:64-108` requires
  `admin:dashboard`, defaults listing to `dead`, and bounds pagination.
- `packages/domain/src/codecamp/review-jobs.ts:130-178` requires the same
  permission and resets a row to a clean `pending` attempt.
- The replay predicate at `packages/domain/src/codecamp/review-jobs.ts:146-158`
  matches only job ID. It does not require `dead`, reject an active `claimed`
  row, check claim age/owner, or emit a platform audit event. Authorization is
  present; replay audit is not.

## Explicit current limitations frozen by executable tests

### Status-only settlement CAS

`applySettle` at `packages/webhooks/src/review-worker.ts:954-982` accepts no
worker/lease token and matches only job ID plus `status='claimed'`. The status
predicate prevents a stale worker from overwriting a row that is currently
`pending` or terminal. It **cannot** reject this sequence:

1. worker A claims the row;
2. visibility timeout reclaims it;
3. worker B re-claims it, so status is again `claimed`;
4. stale worker A settles by ID plus `claimed` and matches worker B's row.

`packages/webhooks/src/__tests__/durable-task2-settle-limit-characterization.test.ts`
executes the real `applySettle` query builder and renders the predicate. Its
only parameters are `[jobId, "claimed"]`; no worker identity or lease token is
present.

### All-state replay

`requeueReviewJob` matches only ID and intentionally resets any prior state.
`packages/domain/src/__tests__/durable-task2-replay-limit-characterization.test.ts`
executes the real domain function for each of
`pending|claimed|succeeded|failed|dead`. All five become `pending`, attempts are
zeroed, claim metadata is cleared, and the rendered predicate contains only the
job ID. A current active claim can therefore be reset by an authorized admin.

Lease-token settlement, active-lease replay rejection, and replay audit events
are intentional future strengthenings. They must be specified by Task 3 and
implemented only in later phases; they are not retroactively attributed to the
current queue.

## Current executable evidence

Commands were run from each package root with the local Vitest binary and
`CI=true`. The multi-file webhooks/API processes were resource-killed before a
terminal result, so those suites were rerun one file at a time; only terminal
per-file results are counted.

- Webhooks: 12 files, **34 passed / 2 skipped / 0 failed**. The two skips are
  the `DIRECT_DATABASE_URL`-gated real-Postgres claim/reclaim cases.
- DB: 2 files, **11 passed / 0 failed**.
- Domain: 2 files, **15 passed / 0 failed** (five all-state replay cases plus
  tenant coverage).
- API: 3 files, **38 passed / 0 failed** (admin wiring, authorization, input
  validation, and error discrimination).
- Focused ESLint: webhooks production/test edit and domain test, **exit 0**.
- Webhooks `tsc --noEmit`, **exit 0**.
- Domain characterization test compilation is proven by Vitest; a later full
  domain `tsc` invocation returned no terminal result under the shared resource
  load and is not claimed Green here.
- `git diff --check` for Task 2 files, **exit 0**.

Historical acceptance remains useful but is not treated as current runtime
truth: `measure/archive/webhook_review_reliability_20260605/final-acceptance-result.json:7-44`
records the accepted 2026-07-04 schema/queue/admin contract, while its notes
about a five-minute default and an unwired worker are superseded by the current
source cited above.

## Task boundary

Task 2 added characterization tests and corrected stale JSDoc only. It did not
add generic ports, handler registries, queue polling to `services/worker`,
schema columns, migrations, lease tokens, audit writes, active-lease rejection,
or any Task 3+ product behavior.
