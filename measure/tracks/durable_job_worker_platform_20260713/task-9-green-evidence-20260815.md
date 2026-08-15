# Task 9 Green Evidence — 2026-08-15

## Scope

Source commit: `d82c44e0cd3240e73f7bd6ce0c1bc65d8ff24303`.

The source preserves JSONB payload types. It also supports the Task 9 conflict,
retry, replay, and audit contracts.

Retry jitter derives from stable job identity. The delay remains bounded and
deterministic under test control.

The adapter returns JSONB values with their original JSON types. The conflict
case preserves the stored payload.

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

Result: exit `0`; `1` passed and `18` skipped.

Disposable PostgreSQL 16 used `docker.io/library/postgres:16-alpine` on the
loopback host network. The server used port `55433` and a dedicated
`durable_job_test_admin_local` database.

```bash
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=<guarded-url> \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-enqueue-retry-replay.red.test.ts
```

Result: exit `0`; `19/19` passed. The post-run query returned `0` scratch
databases and `0` Task 9 roles. The disposable container was removed.

Direct TypeScript, focused ESLint, Prettier, and the exact source-path diff
check exited `0`. Package `pnpm check-types` was network-blocked.

Serialized graph refresh remains pending orchestration support. It is not a
product failure.

## Result

Task 9 is Green. The live PostgreSQL 16 contract passed `19/19`.
