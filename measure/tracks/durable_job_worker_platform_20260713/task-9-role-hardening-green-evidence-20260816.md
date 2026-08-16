# Task 9 Role-Hardening Green Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Task: 9 role hardening
- Role: `measure-jr-green`
- `phase_base_sha`: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- `role_base_sha`: `0e0b420c61885a96f7210fe3777151a0568520dc`
- Implementation commit: `63b41b598ca0bd0cd8defff6658b218b82f6b693`

## Implementation

Migration `0052` hardens both durable-job roles before ownership or grants.
It applies `NOLOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`,
`NOINHERIT`, `NOREPLICATION`, and `NOBYPASSRLS`.
It verifies these attributes before protected objects receive ownership or grants.
Fresh role creation remains `NOLOGIN`.
The existing append-only tables and triggers remain unchanged.

## Verification

### Role-hardening safe default

Command:

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/db exec vitest run \
    src/__tests__/durable-jobs-role-hardening-pg16.red.test.ts
```

Result: exit `0`; 1 test passed. PostgreSQL contact did not occur.

### Role-hardening disposable PostgreSQL 16

The disposable image was `docker.io/library/postgres:16-alpine`.
The server reported version `160014`.
The run used loopback port `55442`.

Result: exit `0`; 1 test passed.
The run verified the pre-existing login and created-database role setup.

Cleanup returned:

```text
CLEANUP_SCRATCH_DATABASES=0
CLEANUP_TASK9_ROLES=0
CONTAINER_REMOVED=true
```

### Task 9 live 19-case gate

The disposable image was `docker.io/library/postgres:16-alpine`.
The run used loopback port `55443`.

Result: exit `0`; 19 tests passed.
The run covered idempotency, JSONB round trips, retry jitter, dead-lettering,
replay authorization, replay audit, and active-lease rejection.

Cleanup returned zero scratch databases and zero Task 9 roles.
The disposable container was removed.

### Migration and quality gates

- Durable migration support tests: 43 passed, 1 skipped, exit `0`.
- Migration governance suite: 51 passed, 2 failed, 1 skipped, exit `1`.
- Full DB package suite: 1,094 passed, 55 failed, 39 skipped, exit `1`.
- Direct DB TypeScript check: passed.
- Direct backend production and test TypeScript checks: passed.
- Direct DB ESLint: 0 errors and 9 existing warnings.
- Direct backend ESLint: passed.
- Prettier check for the immutable Red test: passed.
- Prettier checks for the new evidence and role log: passed.
- Targeted `git diff --check`: passed.

The governance failures report the missing `0052_durable_jobs` sentinel.
The full DB failures are unrelated existing database, identity, and ledger failures.
The package-wrapper typecheck and lint attempts were network-blocked during dependency resolution.
The existing plan has a Markdown indentation warning; historical plan lines were not reformatted.
The Measure doctor reports deprecated markers in unrelated tracks.

No journal, snapshot, registry, metadata, or other migration changed.

## Review B handoff

Review B finding `T5-H6` required database-enforced append-only audit behavior.
The migration keeps the distinct `NOLOGIN` owner, revoked `PUBLIC`, limited runtime grants,
fixed search path, and rejecting audit triggers.
This role hardens pre-existing roles before those protections apply.

Review B can verify implementation commit `63b41b598ca0bd0cd8defff6658b218b82f6b693`.
The committed Red test remains immutable.

MEASURE_AGENT_RESULT
role: measure-jr-green
status: complete
track: durable_job_worker_platform_20260713
phase: Phase 2: Red Concurrency and Failure Tests
task: 9
phase_base_sha: 33d44fc81b84559c2ab7a48acfaf86554bf017a5
role_base_sha: 0e0b420c61885a96f7210fe3777151a0568520dc
implementation_commit: 63b41b598ca0bd0cd8defff6658b218b82f6b693
evidence_commit: 3e6f2a1b78855995ea316938271f03db0baf2fcf
tests_run: role safe 1/1; role live 1/1; Task 9 live 19/19; migration support 43 passed and 1 skipped
cleanup: 0 scratch databases; 0 Task 9 roles; disposable containers removed
known_failures: migration governance 51 passed, 2 failed, 1 skipped; full DB 1094 passed, 55 failed, 39 skipped; unrelated doctor markers; package-wrapper network resolution
files_changed: packages/db/drizzle/0052_durable_jobs.sql; measure/tracks/durable_job_worker_platform_20260713/plan.md; measure/tracks/durable_job_worker_platform_20260713/task-9-role-hardening-green-evidence-20260816.md; measure/tracks/durable_job_worker_platform_20260713/orchestration/phase2-task9-role-hardening-jr-green-role.log
handoff: Review B must verify the implementation commit and the immutable Red test boundary.
END_MEASURE_AGENT_RESULT
