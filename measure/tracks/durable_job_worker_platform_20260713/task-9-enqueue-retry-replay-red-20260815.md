# Task 9 Red Enqueue, Retry, DLQ, and Replay — 2026-08-15

## Scope and status

This note records the Task 9 Red evidence. Task 9 remains `[~]` in `plan.md`.
The phase base is `33d44fc81b84559c2ab7a48acfaf86554bf017a5`.
The role base is `ee8b0bf03f915b17e63edb4cc3b26a710e67b3af`.
Both supplied hashes resolve to commits. The role base is not the phase base.

This role owns one test file and two Measure artifacts. It changed no production
source, schema, migration, adapter, worker, package, or root file.

## Red contract

`packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts`
checks these contracts on the isolated PostgreSQL 16 harness:

- equal enqueue requests return one identity within global and tenant scope;
- a conflicting payload does not replace the existing job;
- equal attempts and timestamps produce one bounded retry delay;
- exhausted attempts enter the dead-letter list with safe error metadata;
- replay requires `admin:dashboard` authorization and writes one safe audit event;
- replay rejects an active lease without changing the lease or audit.

The live suite uses two independent PostgreSQL connections. The harness applies
the migrations in this order: `0000 → 0005 → 0007 → 0025 → 0052`.

## Dirty-path classification

The initial status showed these relevant leased paths:

- `packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts`;
- `measure/tracks/durable_job_worker_platform_20260713/plan.md`.

The following paths were generated or ignorable runtime output and were preserved:

- `.opencode/goals/**`;
- `apps/codecamp-advantage/playwright-report/**`;
- `apps/codecamp-advantage/test-results/**`;
- `apps/advantage-games/test-results/**`.

No unrelated user path was changed.

## Commands and evidence

### Safe default

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `0`; `1` test passed and `6` tests skipped. The run made no
PostgreSQL contact.

### Disposable PostgreSQL 16

```bash
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=<guarded-url> \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `1`; `7` tests ran, with `5` passed and `2` substantive Red
failures.

1. `rejects a conflicting payload for one scoped idempotency key without
   replacement` received `refreshed`, not the required `conflict` outcome.
2. `uses a deterministic bounded retry delay for equal attempts and timestamps`
    produced different delays across eight equal retries.

The other five tests passed. They cover the approved adapter root, scoped equal
enqueue identity, dead-letter metadata, authorized replay audit, and active-lease
replay rejection.

Cleanup found `0` scratch databases matching
`durable_job_pg16_test_%` and `0` Task 9 roles. Formatting and the exact-path
`git diff --check` passed. The supplied checkpoint already ran these commands;
this role did not rerun the test because the test bytes did not change.

## Handoff

Green must change the adapter so conflicting payloads return `conflict` without
replacement. Green must also make retry delay deterministic and bounded under
equal test inputs. Green must rerun the live command and preserve the cleanup
proof.
