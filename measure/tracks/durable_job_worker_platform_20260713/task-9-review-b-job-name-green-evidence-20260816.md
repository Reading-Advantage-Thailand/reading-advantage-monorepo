# Task 9 Review B Job-Name Green Evidence — 2026-08-16

## Provenance

- Track: `durable_job_worker_platform_20260713`
- Phase: Phase 2: Red Concurrency and Failure Tests
- Task: 9 Review B remediation
- Role: `measure-jr-green`
- `phase_base_sha`: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- `role_base_sha`: `a4aa125ab`
- Red source commit: `07791887d`
- Implementation commit: `a26c3aedf`

## Implementation

Migration `0052` now bounds `job_name` at 3 through 160 characters. It checks both
raw and trimmed lengths. It requires the value to equal its trimmed value.

The existing lowercase namespaced grammar remains unchanged. Valid names remain
valid. Role hardening and all protected audit configuration remain unchanged.

## Verification

- Safe schema and focused DB gates passed 31 tests and skipped 1 live test.
- Safe Task 9 enqueue gate passed 1 test and skipped 18 live tests.
- Disposable PG16 role-hardening gate passed 1/1.
- Disposable PG16 Task 9 gate passed 19/19.
- The live schema gate passed 2 tests and failed on the next Red fixture,
  `queue-name-over-bound`. The repaired `job-name-over-bound` fixture rejected
  through `durable_jobs_job_name_check` before this next fixture.
- Migration governance passed 112 tests with 4 intentional skips.
- Journal integrity passed 9/9. Sentinel parity passed.
- DB and backend TypeScript checks passed.
- DB lint passed with 0 errors and 9 existing warnings.
- Prettier passed for changed TypeScript and evidence files. The plan retains its
  pre-existing indentation warning.
- The required-migration doctor gate passed on disposable PG16.
- The safe doctor command failed closed with exit 2 without a database URL.
- Measure doctor failed on deprecated markers in unrelated tracks.
- Cleanup returned zero scratch databases and zero durable-job roles.
- The disposable PostgreSQL container was removed.

## Exact unrelated findings

The next schema failure is a separate committed Red fixture. This lease does not
change its queue contract.

DB lint reports nine existing warnings in `drizzle045-zod-contract.test.ts`,
`journal-integrity.test.ts`, `ledger-doctor.test.ts`, `stale-ledger.test.ts`,
`schema/audit.ts`, `schema/primary.ts`, `schema/progress.ts`, and
`seed/codecamp-users-seed.ts`.

Measure doctor reports deprecated markers in six unrelated plan files:
`apk_cross_host_closeout_20260727`, `apk_legacy_defense_cutover_20260727`,
`apk_legacy_puzzle_cutover_20260727`, `primary_proxy_role_normalization_20260728`,
`reading_remote_font_removal_20260728`, and `workbook_content_versioning_20260711`.

## Review B rerun handoff

Review B should verify commit `a26c3aedf` and this evidence commit. It should retain
the exact `queue-name-over-bound` Red result as the next schema-contract finding.
The committed Red test, sentinel, journal, snapshot, and other paths are unchanged.

MEASURE_AGENT_RESULT
role: measure-jr-green
status: complete_with_recorded_next_red
track: durable_job_worker_platform_20260713
phase: Phase 2: Red Concurrency and Failure Tests
task: 9
phase_base_sha: 33d44fc81b84559c2ab7a48acfaf86554bf017a5
role_base_sha: a4aa125ab
implementation_commit: a26c3aedf
safe_gates: schema 2 passed/1 skipped; focused DB 31 passed/1 skipped; Task 9 1 passed/18 skipped
live_gates: schema 2 passed/1 failed; role 1/1; Task 9 19/19; doctor pass
governance: 112 passed/4 skipped; journal 9/9
cleanup: 0 scratch databases; 0 durable-job roles; disposable container removed
next_red: queue-name-over-bound accepted instead of durable_jobs_queue_name_check rejection
handoff: Review B reruns against implementation commit and this evidence commit
END_MEASURE_AGENT_RESULT
