# Task 7 PostgreSQL 16 Harness Evidence — 2026-07-22

## Status and boundary

Task 7 remediation is ready for independent review but remains **in progress**.
This task adds test-only infrastructure. It does not implement the Task 6
schema fixtures, Task 8/9 queue transitions or races, the Task 11 migration, a
production adapter, roles, triggers, audit tables, or reclaim indexes. The
role-fence, audit-privilege, legacy-preflight, and EXPLAIN surfaces are ordered
extension hooks, not claims that those later database objects exist.

## Files

- `packages/backend/src/jobs/__tests__/postgres16-harness.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.test.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts`
- `orchestration/phase2-task7-mid-red-role.log`

## Fail-closed contract

Live execution requires both:

- `DURABLE_JOB_PG16_TEST_OPT_IN=1`; and
- `DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL`, using `postgres:` or
  `postgresql:`, a loopback hostname, an explicit test role, no URL parameters
  or fragment, and a database named `durable_job_test_admin_*`.

The guard rejects missing or ambiguous opt-in, missing/invalid dedicated URLs,
any non-empty `DATABASE_URL` or `DIRECT_DATABASE_URL`, non-loopback or unsafe
hosts, shared/default databases including `postgres`, project databases, and
every PostgreSQL major other than 16. There is no fallback. Remote-host support
requires a separately reviewed code change rather than a runtime bypass.

Each invocation installs signal cleanup before its first destructive operation,
holds the lifecycle lock through both tracked session probes, and creates a
unique `durable_job_pg16_test_*` database. It verifies two distinct PostgreSQL
backend PIDs, runs `migrate -> setup -> legacyPreflight -> roleFence ->
auditPrivileges -> explainPlans -> test -> teardown`, tracks additional
role-specific connections, terminates remaining scratch sessions, and drops
only its generated database. Stale scratch databases fail closed and are never
deleted automatically.

## Red, Green, and live evidence

- Red: the focused two-file Vitest command failed both suites before collection
  because `./postgres16-harness.js` did not exist.
- Safe default Green: 1 file passed, 1 live file skipped; **26 passed and 1
  skipped**. The exact command was:

  ```bash
  env -u DURABLE_JOB_PG16_TEST_OPT_IN \
      -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
      -u DATABASE_URL \
      -u DIRECT_DATABASE_URL \
    CI=true pnpm --filter @reading-advantage/backend exec vitest run \
      src/jobs/__tests__/postgres16-harness.test.ts \
      src/jobs/__tests__/postgres16-harness.integration.test.ts
  ```

  Exit status was `0`. No PostgreSQL contact occurred.

- Live PG16: a fresh disposable `docker.io/library/postgres:16-alpine`
  container used the dedicated database `durable_job_test_admin_local` on
  loopback port `51255`. The image ID was
  `de3a4eab8fdfa507ea92aac488b916b08089e515db49b055fe71dfa271ba3a28`.
  The exact command was:

  ```bash
  DURABLE_JOB_PG16_TEST_OPT_IN=1 \
  DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgres://durable_test@127.0.0.1:51255/durable_job_test_admin_local \
    CI=true pnpm --filter @reading-advantage/backend exec vitest run \
      src/jobs/__tests__/postgres16-harness.test.ts \
      src/jobs/__tests__/postgres16-harness.integration.test.ts
  ```

  Exit status was `0`; 2 files passed with **27 passed and 0 skipped**.
  The live test proved unique concurrent databases, ordered hooks, failure
  cleanup, additional-role cleanup, stale refusal, version and PID guards,
  cleanup aggregation, and subprocess SIGTERM cleanup.

- Cleanup: the pre-run and post-run queries returned `0` databases matching
  `durable_job_pg16_test_%`. The disposable container was stopped and removed.
  The final container inventory retained only the pre-existing containers.
- Static checks: focused ESLint passed. Backend production and test TypeScript
  was run and retained unrelated pre-existing failures. The harness files had no
  TypeScript diagnostics in that output.
- Isolated live coverage was not rerun for this remediation. The focused live
  suite is the authoritative lifecycle evidence for this task.

No existing database, server, container, or environment URL was reused or
modified. No browser check applies to this backend-only harness task.

## Review gate

Task 7 must not be marked complete and Task 8 must not be unlocked until a
fresh independent reviewer checks URL safety, cleanup under failure, exact hook
order, two-session independence, PG16 enforcement, secret-safe errors, and the
absence of Task 6/8/9 behavior leakage.
