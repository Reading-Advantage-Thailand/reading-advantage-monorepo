# Task 9 Role Hardening Red Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Task: 9 security remediation
- Role: `measure-mid-red`
- `phase_base_sha`: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- `role_base_sha`: `63da03a0e27e0c696df44f2a0285973b269d1cfd`
- HEAD at start: `63da03a0e27e0c696df44f2a0285973b269d1cfd`

## Contract

`packages/db/src/__tests__/durable-jobs-role-hardening-pg16.red.test.ts` runs
against the existing Task 7 PostgreSQL 16 harness.

The test creates both named roles before migration:

- `durable_job_audit_owner` with `LOGIN CREATEDB`.
- `durable_job_queue_runtime` with `LOGIN CREATEDB`.

The migration must fail closed before protected grants and ownership, or enforce
`NOLOGIN` for both roles before it grants runtime access or assigns audit ownership.

The success path verifies both audit tables and the append-only trigger function.
It verifies that their owner role cannot retain login capability.

The failure path verifies no unsafe role owns a protected object and receives no
runtime audit grant. Cleanup drops only roles created by this test.

## Verification

### Safe default

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/db exec vitest run \
    src/__tests__/durable-jobs-role-hardening-pg16.red.test.ts
```

Result: exit `0`; one test passed. The harness returned before PostgreSQL
connection because the explicit opt-in was absent.

### Disposable PostgreSQL 16

The run used a new `docker.io/library/postgres:16-alpine` container with host
networking, port `55441`, and database `durable_job_test_admin_local`.

```bash
podman run --rm --name task9-role-hardening-pg16-red --network host \
  -e POSTGRES_USER=durable_test \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_DB=durable_job_test_admin_local \
  -d docker.io/library/postgres:16-alpine -p 55441

env -u DATABASE_URL -u DIRECT_DATABASE_URL \
  DURABLE_JOB_PG16_TEST_OPT_IN=1 \
  DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgres://durable_test@127.0.0.1:55441/durable_job_test_admin_local \
  CI=true pnpm --filter @reading-advantage/db exec vitest run \
    src/__tests__/durable-jobs-role-hardening-pg16.red.test.ts
```

PostgreSQL reported server version `160014`.

Result: exit `1`; one test ran and one test failed.

Exact failure:

```text
durable_job_audit_owner must be NOLOGIN before protected grants and ownership.:
expected true to be false
```

This is the only test failure. PostgreSQL emitted two identifier-truncation
notices from earlier migrations. They were not test failures.

Cleanup returned:

```text
CLEANUP_SCRATCH_DATABASES=0
CLEANUP_TASK9_ROLES=0
CONTAINER_REMOVED=true
```

### Static checks

- Focused TypeScript no-emit check passed.
- `@reading-advantage/db` typecheck passed.
- Package-local ESLint passed.
- Prettier check passed.
- Targeted `git diff --check` passed.

## Green handoff

Green must update migration `0052` without changing this Red test.
The migration must reject unsafe pre-existing roles or enforce `NOLOGIN` first.
Green must rerun the safe-default and disposable PostgreSQL 16 commands.

Task 9 remains `[~]` until this security contract passes.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete
track: durable_job_worker_platform_20260713
phase: Phase 2: Red Concurrency and Failure Tests
task: 9
phase_base_sha: 33d44fc81b84559c2ab7a48acfaf86554bf017a5
role_base_sha: 63da03a0e27e0c696df44f2a0285973b269d1cfd
tests_run: safe default 1 passed; disposable PostgreSQL 16 1 failed
exact_failure: durable_job_audit_owner retained rolcanlogin=true
cleanup: 0 scratch databases; 0 Task 9 roles; container removed
files_changed: packages/db/src/__tests__/durable-jobs-role-hardening-pg16.red.test.ts; measure/tracks/durable_job_worker_platform_20260713/plan.md; measure/tracks/durable_job_worker_platform_20260713/task-9-role-hardening-red-20260816.md; measure/tracks/durable_job_worker_platform_20260713/orchestration/phase2-task9-role-hardening-mid-red-role.log
handoff: Green must fail closed or enforce and verify NOLOGIN before protected grants and ownership
END_MEASURE_AGENT_RESULT
