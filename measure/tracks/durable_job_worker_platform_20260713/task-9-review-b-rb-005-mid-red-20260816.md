# Task 9 Review B Finding DWP-T9-RB-005 Mid Red Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Task: 9
- Role: `measure-mid-red`
- Finding: `DWP-T9-RB-005`
- Phase base SHA: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- Role base SHA: `9d6b3af2608f0df7733197692a642905953c71f4`
- Review B artifact: `measure/runs/durable_job_worker_platform_20260713/task9-review-b-eed2537d3.json`

## Scope

The Review B artifact identified a PostgreSQL-reserved `constraint` alias in the
Task 6 PG16 schema test. The candidate migration does not contain this query.

The test-only change replaced `constraint` with `constraint_row` in all three
catalog queries. It also projects `constraint_row.conname AS constraint_name`.
This preserves the existing result shape and all test assertions.

No migration, sentinel, production source, journal, snapshot, registry, metadata,
generated file, graph file, or other lane changed.

## Verification

### Safe schema gate

Command:

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true node node_modules/vitest/vitest.mjs run \
  packages/db/src/__tests__/durable-jobs-schema-pg16.red.test.ts
```

Result: exit `0`; 2 tests passed and 1 test skipped. The run made no PostgreSQL
connection.

### Disposable PostgreSQL 16 schema gate

The first mapped-port container attempt failed before test execution. Podman
reported:

```text
pasta failed with exit code 1:
netlink: Too many routes to duplicate
Couldn't set IPv4 route(s) in guest: Argument list too long
```

The disposable fallback used host networking, PostgreSQL `16.14`, port `55449`,
and database `durable_job_test_admin_local`.

Command:

```bash
env -u DATABASE_URL -u DIRECT_DATABASE_URL \
  DURABLE_JOB_PG16_TEST_OPT_IN=1 \
  DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgres://durable_test@127.0.0.1:55449/durable_job_test_admin_local \
  CI=true node node_modules/vitest/vitest.mjs run \
  packages/db/src/__tests__/durable-jobs-schema-pg16.red.test.ts
```

The final run exited `1`. Three tests ran, 2 passed, and 1 failed.

The first run after the alias replacement exposed this exact query failure:

```text
PostgresError: column "constraint_name" does not exist
```

The test-only query now uses `constraint_row.conname AS constraint_name`. This
keeps the assertion result field unchanged.

The final run exposed this substantive Red assertion failure:

```text
AssertionError: durable_job_audit_events.actor requires a database length bound.: expected 'CHECK (actor IS NOT NULL AND char_length(btrim(actor)) >= 1 AND char_length(btrim(actor)) <= 200) CHECK (authorization_decision_id IS NOT NULL AND char_length(btrim(authorization_decision_id)) >= 1 AND char_length(btrim(authorization_decision_id)) <= 200) CHECK (correlation_id IS NOT NULL AND char_length(btrim(correlation_id)) >= 1 AND char_length(btrim(correlation_id)) <= 200) CHECK (reason IS NOT NULL AND char_length(reason) >= 1 AND char_length(reason) <= 500)' to match /(?:char_length|length)\s*\(\s*actor\s*\)\s*(?:BETWEEN|>=|>|=|<=|<)/i
```

This lease records the failure and does not change the assertion or migration.

### Cleanup

The harness reported zero scratch databases before container removal. The admin
database contained two migration-created durable-job roles before removal. The
disposable container was removed, which removed those roles with the container.

## Quality gates

- TypeScript: `node_modules/.bin/tsc --noEmit -p packages/db/tsconfig.json` passed.
- ESLint: focused test lint passed with the package config.
- Prettier: focused test check passed.
- Diff check: `git diff --check` passed for the changed test.

The package-filtered typecheck attempted dependency installation and was stopped
by unavailable registry downloads. The direct TypeScript check passed.

## Green sentinel handoff

`DWP-T9-RB-005` is repaired through the safe catalog alias change. Green owns the
separate migration sentinel finding `DWP-T9-RB-002`. Green must not edit the
immutable test assertion or the migration for this evidence.

Task 9 retains the recorded live behavior evidence. The schema gate remains Red
on the exact `char_length(actor)` versus `char_length(btrim(actor))` assertion.
