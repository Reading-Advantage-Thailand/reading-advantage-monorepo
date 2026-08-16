# Task 9 Review B Rerun-Bound Green Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Task: 9 Review B remediation
- Role: `measure-jr-green`
- `phase_base_sha`: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- `role_base_sha`: `ecdf1fef1`
- Red source commit: `ecdf1fef1`
- Implementation commit: `a554da1af`

## Implementation

Migration `0052` now requires active rerun maximum attempts from 1 through 1000.
The all-null rerun tuple remains valid for ordinary jobs.

The existing `durable_jobs_rerun_tuple_check` rejects zero and values above 1000.
Role hardening, job-name bounds, queue-name bounds, and protected audit checks remain unchanged.

## Verification

- Safe schema passed 2 tests and skipped 1 live test.
- Safe focused DB passed 17/17 tests.
- Safe role hardening passed 1/1.
- Safe Task 9 passed 1 test and skipped 18 live tests.
- Disposable PostgreSQL 16 role-hardening passed 1/1.
- Disposable PostgreSQL 16 Task 9 passed 19/19.
- The live schema gate passed 2 tests and failed on the next Red fixture,
  `pending-at-maximum-without-redelivery`.
- The exact fixture was accepted instead of rejecting through
  `durable_jobs_redelivery_state_check`.
- Journal integrity passed 9/9.
- Database and backend TypeScript checks passed.
- Database ESLint passed with the repository compatibility configuration.
- Prettier passed for the evidence file. The plan retains its prior warning.
- The safe migration doctor failed closed with exit 2 without a database URL.
- Measure doctor reported deprecated markers in unrelated tracks.
- The scoped diff check passed.
- Cleanup returned zero scratch databases and zero Task 9 roles.
- The disposable PostgreSQL container was removed after verification.

## Governance boundary

The prior accepted governance gate recorded 112 passed tests and 4 skips.

The current checkout did not reproduce that exact aggregate. A broader direct
governance sweep returned 248 passed, 17 failed, and 604 skipped tests.

Its failures include stale 52-migration-count assertions and unrelated append-only
PGlite reset failures. This lease did not edit those paths.

## Exact next Red

The next committed Red fixture is `pending-at-maximum-without-redelivery`.
It accepts `attempt=3` and `max_attempts=3` while `redeliver_current_attempt=false`.
It expects rejection through `durable_jobs_redelivery_state_check`.

## Review B rerun handoff

Review B should verify commit `a554da1af` and this evidence commit. It should retain
the exact pending-at-maximum Red result as the next schema-contract finding.
The committed Red tests, sentinels, journal, snapshots, and other paths are unchanged.

MEASURE_AGENT_RESULT
role: measure-jr-green
status: complete_with_recorded_next_red
track: durable_job_worker_platform_20260713
phase: Phase 2: Red Concurrency and Failure Tests
task: 9
phase_base_sha: 33d44fc81b84559c2ab7a48acfaf86554bf017a5
role_base_sha: ecdf1fef1
implementation_commit: a554da1af
safe_gates: schema 2 passed/1 skipped; focused DB 17 passed; role 1 passed; Task 9 1 passed/18 skipped
live_gates: schema 2 passed/1 failed; role 1/1; Task 9 19/19
journal: 9 passed
governance: prior accepted 112 passed/4 skipped; current aggregate not reproduced
cleanup: 0 scratch databases; 0 durable-job roles; disposable container removed
next_red: pending-at-maximum-without-redelivery accepted instead of durable_jobs_redelivery_state_check rejection
handoff: Review B reruns against implementation commit and this evidence commit
END_MEASURE_AGENT_RESULT
