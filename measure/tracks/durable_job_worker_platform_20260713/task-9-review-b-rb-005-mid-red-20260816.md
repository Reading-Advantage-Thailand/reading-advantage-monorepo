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

## Trigger catalog follow-up — 2026-08-16

### Provenance

- Current HEAD at role start: `f3b1fd371c29461721c7531c37cc26d1b8b56857`
- Existing Task 9 phase base: `33d44fc81b84559c2ab7a48acfaf86554bf017a5`
- Scope: the preserved PG16 schema test trigger assertion only

The prior live failure showed that `information_schema.triggers` returned only
the update/delete trigger. PostgreSQL does not expose the TRUNCATE row there.

The test now queries `pg_catalog.pg_trigger`, `pg_catalog.pg_proc`, and
`pg_catalog.pg_class`. It preserves the trigger name and owner assertions. It
also proves `durable_job_reject_audit_mutation` for both triggers and exact
`tgtype` values: `34` for BEFORE TRUNCATE and `27` for BEFORE UPDATE OR DELETE
FOR EACH ROW.

### Schema gates

The safe schema command passed 2 tests and skipped 1 without PostgreSQL contact.

The first live run after this query change exposed this exact test metadata
failure:

```text
AssertionError: expected [ { …(4) }, { …(4) } ] to deeply equal [ { …(4) }, { …(4) } ]
Expected trigger_type: 26
Received trigger_type: 27
```

The test now expects `27`, which includes the row-level bit.

The final disposable PostgreSQL 16 schema gate used server `160014`, ran 3
tests, passed 2, and exited `1` on the existing fixture contract.

The exact final failure was:

```text
Fixture: job-name-over-bound
Expected: rejection through durable_jobs_job_name_check
Actual: promise resolved "undefined" instead of rejecting
```

The fixture inserts `a.${"a".repeat(159)}`. This newly exposed failure is outside
the trigger assertion. This lease records it without changing the fixture,
migration, or substantive rejection assertion.

Cleanup returned server `160014`, zero scratch databases, and the disposable
container was removed.

### Available Task 9 gates

- Safe role-hardening gate: 1/1 passed.
- Disposable PostgreSQL 16 role-hardening gate: 1/1 passed.
- Task 9 post-review security tests: 3/3 passed.
- Safe Task 9 enqueue/retry/replay gate: 1 passed and 18 skipped.
- Disposable PostgreSQL 16 Task 9 enqueue/retry/replay gate: 19/19 passed.
- Cleanup returned zero scratch databases and zero Task 9 roles.

### Quality gates

- Direct TypeScript: `node_modules/.bin/tsc --noEmit -p packages/db/tsconfig.json` passed.
- Focused ESLint with `packages/db/eslint.config.mjs` passed.
- Prettier passed for the changed test and evidence file.
- `git diff --check` passed for the leased tracked paths.
- The full plan Prettier check retained a pre-existing Markdown indentation warning.
  The plan was not reformatted.

### Review B handoff

The DWP-T9-RB-005 trigger catalog defect is repaired in the test boundary.
Review B should retain the exact `job-name-over-bound` Red failure as a separate
schema-contract finding. No migration, sentinel, production source, journal, or
snapshot changed.

## DWP-T9-RB-006 rerun fixture follow-up — 2026-08-16

### Accepted contract and fixture cause

Review B requires each invalid fixture to fail through its declared database
constraint. It does not accept a row that fails through a different constraint.

The rerun tuple check accepts either all five snapshot fields as `NULL` or all
five fields as non-`NULL`. The rerun state check requires the same completeness
when `rerun_requested=true` and `state='running'`.

`rerun-partial-01` starts with the canonical running row and `rerun_requested=true`.
It keeps `rerun_queue_name` and nulls the other four snapshot fields. The row
violates both checks. PostgreSQL reports `durable_jobs_rerun_state_check` first.
The row is rejected. It is not accepted by the database.

The false setup was the fixture's expected constraint, not its invalid row. The
smallest correction changed `rerunPartialFixtures.expectedConstraint` to
`durable_jobs_rerun_state_check`. The rejection code and named-constraint
assertion remain unchanged.

### Verification

- Safe schema gate: 2 passed and 1 skipped without PostgreSQL contact.
- Disposable PostgreSQL 16 schema gate: 3 tests ran; 2 passed and 1 failed.
- `rerun-partial-01` now passed its exact rejection assertion.

The next exact Red failure is:

```text
AssertionError: rerun-columns-with-flag-false must fail through durable_jobs_rerun_tuple_check.
Expected constraint_name: durable_jobs_rerun_tuple_check
Received constraint_name: durable_jobs_rerun_state_check
```

That fixture keeps the complete rerun snapshot and sets `rerun_requested=false`.
The tuple check passes. The state check rejects the row because a false request
requires all rerun snapshot fields to be `NULL`.

This lease records the next fixture without changing its assertion or migration.

### Other requested gates

- Safe role-hardening gate: 1/1 passed.
- Disposable PostgreSQL 16 role-hardening gate: 1/1 passed.
- Task 9 post-review security tests: 3/3 passed.
- Safe Task 9 enqueue/retry/replay gate: 1 passed and 18 skipped.
- Disposable PostgreSQL 16 Task 9 gate: 19/19 passed.
- Cleanup returned zero scratch databases and zero Task 9 roles.
- Direct TypeScript, focused ESLint, and scoped diff checks passed.
- Prettier passed for the schema test and evidence file. The fixture retains a
  pre-existing formatting warning.
- The full plan Prettier check retains a pre-existing Markdown indentation warning.

### Green handoff

Green must not change the rerun production constraints for DWP-T9-RB-006.
Review B receives the corrected partial fixture and the exact next Red failure.

## DWP-T9-RB-006 flag-fixture follow-up — 2026-08-16

### Contract and correction

`rerun-columns-with-flag-false` starts from a valid running row with all five
rerun fields populated. It sets `rerun_requested=false`.

The tuple check passes because all five fields are non-`NULL`. The state check
rejects the row because a false request requires all five fields to be `NULL`.
The fixture's expected constraint was false. This correction changes only its
expected constraint to `durable_jobs_rerun_state_check`.

The rejection code and named-constraint assertion remain unchanged.

### Verification

- Safe schema gate: 2 passed and 1 skipped without PostgreSQL contact.
- Disposable PostgreSQL 16 schema gate: 3 tests ran; 2 passed and 1 failed.
- `rerun-columns-with-flag-false` now passed its exact rejection assertion.

The next exact substantive Red failure is:

```text
AssertionError: rerun-flag-with-null-columns must fail through durable_jobs_rerun_tuple_check.
Expected constraint_name: durable_jobs_rerun_tuple_check
Received constraint_name: durable_jobs_rerun_state_check
```

That fixture keeps `rerun_requested=true` and nulls all five rerun fields. The
tuple check passes because all fields are `NULL`. The state check rejects the
row because a true running rerun requires all five fields to be non-`NULL`.

This lease records the next fixture without changing its assertion or migration.

### Review B handoff

Green must not change rerun production constraints for DWP-T9-RB-006. Review B
receives the corrected flag fixture and the exact next Red failure.

## Rerun bound follow-up — 2026-08-16

The corrected `rerun-flag-with-null-columns` fixture now passes its exact
`durable_jobs_rerun_state_check` rejection.

The final disposable PostgreSQL 16 schema gate still ran 3 tests, passed 2, and
failed on the next substantive Red case:

```text
Fixture: rerun-maximum-under-bound
Override: rerun_max_attempts=0
Expected: rejection through durable_jobs_rerun_tuple_check
Actual: promise resolved "undefined" instead of rejecting
```

The rerun tuple and state checks enforce field completeness. They do not enforce
a positive or bounded value for `rerun_max_attempts`. The existing
`durable_jobs_attempt_bounds_check` bounds `max_attempts`, not `rerun_max_attempts`.

This failure is candidate-attributable and requires a Green migration change.
This lease does not change the migration or weaken the fixture assertion.

### Green handoff

Green must add the reviewed rerun-attempt bound constraint and update its own
migration evidence. Review B receives the exact `rerun-maximum-under-bound`
failure and the completed fixture-specific Red corrections.

## Complete durable-jobs fixture reconciliation — 2026-08-16

### Method

The current fixture set contains no false expected-constraint labels after the
prior rerun corrections. Each rejected row reports its expected first check.

The PG16 schema test now collects every fixture failure and deletes each fixture
row in `finally`. The test still requires code `23514` and the exact expected
constraint for every fixture. Cleanup prevents accepted rows from causing
duplicate-key noise in later fixtures.

### Full live result

The safe schema gate passed 2 tests and skipped 1. The disposable PostgreSQL 16
schema gate ran 3 tests, passed 2, and reported all remaining production Red
failures together.

1. `pending-at-maximum-without-redelivery` was accepted instead of rejecting
   through `durable_jobs_redelivery_state_check`. The redelivery check allows
   `redeliver_current_attempt=false` without rejecting a pending row at its
   maximum attempt.
2. `running-attempt-zero` was accepted instead of rejecting through
   `durable_jobs_state_truth_table_check`. The running state check does not
   require `attempt >= 1`.
3. `dead-attempt-zero` was accepted instead of rejecting through
   `durable_jobs_state_truth_table_check`. The dead state check does not require
   `attempt >= 1`.

These are candidate-attributable production contract failures. This lease does
not change the migration or weaken any assertion.

### Requested gates

- Safe role-hardening: 1/1 passed.
- Disposable PostgreSQL 16 role-hardening: 1/1 passed.
- Task 9 security: 3/3 passed.
- Safe Task 9: 1 passed and 18 skipped.
- Disposable PostgreSQL 16 Task 9: 19/19 passed.
- Focused DB governance and journal suite: 31 passed and 1 skipped.
- Journal integrity: 9/9 passed.
- Direct TypeScript, ESLint, Prettier, and diff checks passed.
- Fixture and plan Prettier warnings remain pre-existing.

### Green handoff

Green must add reviewed constraints for pending-at-maximum redelivery, running
attempt lower bounds, and dead attempt lower bounds. Review B receives the full
three-failure production Red list.
