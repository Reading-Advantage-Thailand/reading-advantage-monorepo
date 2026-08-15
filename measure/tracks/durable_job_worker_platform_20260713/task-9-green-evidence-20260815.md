# Task 9 Green Evidence — 2026-08-15

## Scope

Source commit: `103497df2`.

The change adds the `conflict` enqueue result. The PostgreSQL adapter returns it
when an idempotency identity has a different payload fingerprint. The stored row
is not updated.

Retry jitter now derives from the stable job-name, queue-name, and attempt
identity. The delay remains between the exponential delay and the 250 ms jitter
bound. It does not use runtime randomness.

The adapter also decodes a PostgreSQL JSON string before it returns a claimed
payload. The conflict test checks that the original payload remains unchanged.

## Commands

Safe default:

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `0`; `1` passed and `6` skipped.

Disposable PostgreSQL 16 used `docker.io/library/postgres:16-alpine` on the
loopback host network. The server used port `55433` and a dedicated
`durable_job_test_admin_local` database.

```bash
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=<guarded-url> \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `0`; `7` passed. The post-run query returned `0` scratch databases
and `0` Task 9 roles. The disposable container was removed.

Focused type checks and ESLint exited `0`. The adapter Prettier check and the
exact source-path diff check exited `0`. `contracts.ts` and `ports.ts` have
pre-existing Prettier deviations at `HEAD`; this change did not add them.

## Result

Task 9 is Green. The five existing live contracts remain Green with the new
conflict and deterministic retry contracts.
