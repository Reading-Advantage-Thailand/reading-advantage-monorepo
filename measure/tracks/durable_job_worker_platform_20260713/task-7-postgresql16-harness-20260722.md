# Task 7 PostgreSQL 16 Harness Evidence — 2026-07-22

## Status and boundary

Task 7 implementation is ready for independent review but remains **in
progress**. This task adds test-only infrastructure; it does not implement the
Task 6 schema fixtures, the Task 8/9 queue transitions or races, the Task 11
migration, a production adapter, roles, triggers, audit tables, or reclaim
indexes. The role-fence, audit-privilege, legacy-preflight, and EXPLAIN surfaces
are ordered extension hooks, not claims that those later database objects
exist.

## Files

- `packages/backend/src/jobs/__tests__/postgres16-harness.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.test.ts`
- `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts`

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

Each invocation creates a unique `durable_job_pg16_test_*` database, verifies
two distinct PostgreSQL backend PIDs, runs `migrate -> setup -> legacyPreflight
-> roleFence -> auditPrivileges -> explainPlans -> test -> teardown`, tracks
additional role-specific connections, terminates remaining scratch sessions,
and drops only its generated database. Stale scratch databases fail closed and
are never deleted automatically.

## Red, Green, and live evidence

- Red: the focused two-file Vitest command failed both suites before collection
  because `./postgres16-harness.js` did not exist.
- Safe default Green: 1 file passed, 1 live file skipped; 22 passed and 1
  skipped. Absence of opt-in does not contact PostgreSQL.
- Live PG16: a uniquely named disposable
  `docker.io/library/postgres:16-alpine` container used dedicated database
  `durable_job_test_admin_local` on a random loopback port. The exact focused
  suite passed 2 files and 23 tests. The test proved the ordered hooks, migrated
  marker visibility, and distinct backend sessions.
- Cleanup: the post-test query returned `0` databases matching
  `durable_job_pg16_test_%`; the disposable container was stopped and
  auto-removed. The final container inventory contained only the same two
  pre-existing containers observed before the run.
- Static checks: focused ESLint passed. Backend production and test TypeScript
  passed after one local narrowing correction.
- Isolated live coverage passed all 23 tests and reported 79.64% statements,
  69.86% branches, 73.68% functions, and 80.60% lines. This is recorded
  honestly and is not used to claim the repository's >80% target across every
  metric; the lifecycle error-path tests remain reviewer-visible follow-up.

No existing database, server, container, or environment URL was reused or
modified. No browser check applies to this backend-only harness task.

## Review gate

Task 7 must not be marked complete and Task 8 must not be unlocked until a
fresh independent reviewer checks URL safety, cleanup under failure, exact hook
order, two-session independence, PG16 enforcement, secret-safe errors, and the
absence of Task 6/8/9 behavior leakage.
