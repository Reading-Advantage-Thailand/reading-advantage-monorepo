# Phase 3 Review A Mid Red Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 3: PostgreSQL Adapter Implementation
- Role: `measure-mid-red`
- Findings: `DWP3-RA-H2`, `DWP3-RA-M1`, `DWP3-RA-M2`, `DWP3-RA-L1`
- Current HEAD start: `3d66149bf3d5a0b68f0ac2861ce6392bdb0112c8`

## Scope

The leased changes touch only these existing tests, the durable-job plan, and
new Red evidence and role-log files. No production source, migration, sentinel,
tenant registry, journal, or snapshot changed.

## New live contracts

- Task 9 now checks the complete active-enqueue follow-up snapshot, including
  queue, payload, maximum attempts, and schedule.
- Task 9 checks last-commit-wins snapshots and both lock orders for settle,
  fail, and reclaim against active enqueue.
- Task 8 checks a valid heartbeat extension through an independent expiry read
  and a later settlement.
- Task 6 checks UPDATE, DELETE, and TRUNCATE rejection on both audit tables.

Existing assertions remain unchanged. The new assertions fail closed when the
candidate adapter does not provide the reviewed behavior.

## Verification

### Safe suites

Command:

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true node node_modules/vitest/vitest.mjs run \
  packages/backend/src/jobs/__tests__/postgres16-concurrency.red.test.ts \
  packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts \
  packages/db/src/__tests__/durable-jobs-schema-pg16.red.test.ts
```

Result: exit `0`; 9 tests passed and 32 tests skipped. The run made no
PostgreSQL connection.

### Disposable PostgreSQL 16 suites

The final isolated runs used PostgreSQL `16.14` and separate host-networked
containers. Isolated runs avoid the shared role and scratch-database overlap
that occurs when the two backend harness suites run together.

- Schema suite on port `55453`: exit `0`; 3/3 passed, including six audit
  mutation rejections. Scratch databases: 0. Migration-created roles remained
  inside the disposable container. The container was removed.
- Concurrency suite on port `55454`: exit `0`; 14/14 passed, including positive
  heartbeat extension and settlement. Scratch databases: 0. Test-owned roles: 0. The container was removed.
- Enqueue suite on port `55456`: exit `1`; 20/24 passed and 4 new tests failed.
  Scratch databases: 0. Test-owned roles: 0. The container was removed.

TypeScript checks passed for the backend test and database projects. Focused
ESLint, Prettier, and `git diff --check` passed. The full durable-job plan also
passes Prettier after formatting.

## New production failures

1. `persists every active-enqueue field and promotes the complete snapshot on
settle` received `outcome: conflict` instead of
   `active-lease-retained` for a changed active follow-up payload.
2. `keeps concurrent active-enqueue snapshots complete and last-commit-wins`
   received `outcome: conflict` instead of `active-lease-retained` for the
   changed active follow-up request.
3. `covers both fail and active-enqueue lock orders` left generation `1`
   instead of promoting the complete follow-up as generation `2` after the
   transition-first order.
4. `covers both reclaim and active-enqueue lock orders` left generation `1`
   instead of promoting the complete follow-up as generation `2` after the
   transition-first order.

The settle/enqueue lock-order test passed in both orders. These failures are
candidate-attributable. This lease does not edit production behavior.

## Green batch handoff

Green receives the four failures as one batch. Green must make active enqueue
accept a complete changed follow-up snapshot and promote retry or redelivery
pending rows as a new generation. Green must rerun all three isolated PG16
suites and preserve the heartbeat and audit mutation evidence.

## Preserved complete-enqueue mismatch — 2026-08-16

Green commit `ee5442654` correctly promoted the complete follow-up snapshot to
`task9-follow-up-queue`. The first snapshot test then called `claimRequest` with
its default `task9-red` queue. The claim returned empty because queue isolation
worked as designed.

The accepted T5-H3 contract requires the promoted queue to remain the current
queue. The fixture proves that the expected claim queue is the follow-up queue,
not the default queue. The smallest correction sets the claim request queue to
`followUp.queueName`. No production source changed.

### Final verification from `c572d0b87`

- Safe complete enqueue: 1 passed and 23 skipped.
- Safe combined schema, role, concurrency, and Task 9 files: 10 passed and 32 skipped.
- Live schema: 3/3 passed on PostgreSQL 16.14.
- Live role hardening: 1/1 passed on PostgreSQL 16.14.
- Live concurrency: 14/14 passed on PostgreSQL 16.14.
- Live complete enqueue: 24/24 passed on PostgreSQL 16.14.
- TypeScript, ESLint, Prettier, and `git diff --check` passed.
- The first role rerun found two stale test-owned roles in the shared test
  cluster. Scratch databases were already absent. Removing those test-owned
  roles allowed the role test to pass. Final scratch databases and roles were
  both zero.

No production Red remains for this preserved mismatch. Review A receives the
false expected-queue correction and the complete green PG16 batch.

## Review A rerun — 2026-08-16

The rerun started at `27c7f4f23` after correction commit `98bdfca33`.
Production source and migrations remained unchanged.

- Safe complete enqueue: 1 passed and 23 skipped.
- Live schema: 3/3 passed on PostgreSQL 16.14.
- Live concurrency: 14/14 passed on PostgreSQL 16.14.
- Live complete enqueue: 24/24 passed on PostgreSQL 16.14.
- Backend and database TypeScript checks passed.
- Backend lint, focused Prettier, and `git diff --check` passed.

The migration tests left two named test roles after their scratch databases
were removed. The rerun verified zero scratch databases, removed only those
test-owned roles, and verified zero scratch databases and roles afterward.

No production Red remains. Review A receives the rerun counts, cleanup proof,
and the unchanged `followUp.queueName` correction.
