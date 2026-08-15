# Task 9 Security Red Remediation — 2026-08-15

## Scope

This note records the amended Task 9 Red contract.

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Role: `measure-mid-red`
- `phase_base_sha`: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- `role_base_sha`: `58f82e936dc95796ded9158492e98999f487fe1d`

The role changed one test and three track artifacts. It changed no production
source, schema, migration, adapter, worker, package, or root file.

## Amended Red contract

`packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts`
now covers:

- an injected replay-authorization verifier;
- forged, stale, wrong-job, wrong-tenant, malformed, and correlation-mismatched
  replay denials;
- JSONB string, object-like string, number, array, and object round trips;
- JSONB poison-row isolation;
- repeated jitter for one job and attempt, bounded delay, and job-specific
  dispersion; and
- one shared idempotency key across global and two tenant scopes.

Every denial case checks the job snapshot and replay audit before and after the
verifier call. The contract requires denial before either write.

## Preflight

The supplied `phase_base_sha` and `role_base_sha` resolve to commits. Task 9
was already `[~]` before this work.

Relevant leased paths were the amended Red test and the Task 9 plan. Generated
or ignorable paths were preserved under `.opencode/goals/**`, Codecamp reports
and test results, and Advantage Games test results. Unrelated finance and
Mastery Runtime changes were preserved.

## Verification

### Format and typecheck

```text
node_modules/.bin/prettier --write packages/backend/src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Passed.

```text
node_modules/.bin/tsc --noEmit -p packages/backend/tsconfig.test.json
```

Passed.

### Safe default

The command ran from `packages/backend`:

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true node ../../node_modules/vitest/vitest.mjs run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `0`; `19` total tests (`PASS=1`, `SKIP=18`, `FAIL=0`). The run
made no PostgreSQL contact.

### Disposable PostgreSQL 16

Podman used the host-network pattern with
`docker.io/library/postgres:16-alpine`, port `55433`, and the dedicated
database `durable_job_test_admin_local`. The server reported version `160014`.

```bash
env -u DATABASE_URL -u DIRECT_DATABASE_URL \
  DURABLE_JOB_PG16_TEST_OPT_IN=1 \
  DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgres://durable_test:<test-password>@127.0.0.1:55433/durable_job_test_admin_local \
  CI=true node ../../node_modules/vitest/vitest.mjs run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `1`; `19` total tests (`PASS=7`, `FAIL=12`).

Passing cases:

1. Exact PostgreSQL adapter root and factory.
2. Shared idempotency scope across global and two tenant scopes.
3. Conflicting payload preservation.
4. Object-like JSONB poison-row isolation.
5. Exhaustion and safe dead-letter metadata.
6. Verified terminal replay and one safe audit event.
7. Active-lease replay rejection without lease or audit changes.

Failing cases:

1. `round-trips JSONB plain string values exactly`: PostgreSQL returned a
   quoted JSON string.
2. `round-trips JSONB object-like string values exactly`: PostgreSQL returned a
   quoted JSON string.
3. `round-trips JSONB number values exactly`: PostgreSQL returned the text
   value `"42"`.
4. `round-trips JSONB array values exactly`: PostgreSQL returned JSON text.
5. `round-trips JSONB object values exactly`: PostgreSQL returned JSON text.
6. `repeats jitter per job and attempt, bounds delay, and disperses job IDs`:
   sixteen unrelated jobs produced one delay value.
7. `denies a forged replay receipt before writing or auditing`: no denial error
   was raised.
8. `denies a stale replay receipt before writing or auditing`: no denial error
   was raised.
9. `denies a receipt signed for another job before writing or auditing`: no
   denial error was raised.
10. `denies a receipt signed for another tenant before writing or auditing`:
    no denial error was raised.
11. `denies a malformed replay receipt before writing or auditing`: no denial
    error was raised.
12. `denies a correlation-mismatched receipt before writing or auditing`: no
    denial error was raised.

Cleanup queries returned:

```text
CLEANUP_SCRATCH_DATABASES=0
CLEANUP_TASK9_ROLES=0
```

The disposable container was removed after the queries. Task 9 remains `[~]`.

## Handoff

Green must decode JSONB values without changing their primitive types, derive
jitter from job identity, and reject every invalid replay authorization before
the job or audit write.
