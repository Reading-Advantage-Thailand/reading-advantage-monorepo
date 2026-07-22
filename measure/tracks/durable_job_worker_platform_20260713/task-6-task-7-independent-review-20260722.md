# Tasks 6–7 Independent Foundation Review — 2026-07-22

## Findings-first verdict

**Task 6: FAIL. Task 7: FAIL.** Both producers established useful Red/test
foundations, and the focused type, lint, and safe-default gates are Green, but
four blocking correctness gaps remain. Task 6's counterexamples are not yet
valid executable database rows and its source checks can be made Green without
implementing the normative SQL semantics. Task 7 has a parallel-start race and
does not prove deterministic cleanup for failure or signal paths.

This review is read-only with respect to producer code and Measure status. It
does not mark either task complete, unlock Task 8 or Task 9, stage files, or
make a browser/runtime product claim.

## Findings

### High — DWP-T6-H1: partial-tuple fixtures fail before the intended constraint

- **Files:**
  `packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts:58-96,217-230,273-277,353-356,409-414`
- **Evidence:** `partialTuples()` assigns one literal string, `"present"`, to
  every selected field. That makes `lease_expires_at` an invalid timestamp,
  `rerun_max_attempts` an invalid integer, and both SHA-256 fields invalid
  digests. Several state fixtures also set `rerun_requested=true` without a
  complete otherwise-valid snapshot. A future PostgreSQL insertion can fail on
  input conversion, a format check, or the all-or-none tuple check before the
  fixture reaches its claimed `expectedConstraint`.
- **Impact:** the six lease and thirty rerun counterexamples do not isolate the
  invariant they are supposed to freeze. Task 11/14 could appear to reject the
  rows for the wrong reason.
- **Required remediation:** build column-aware canonical values (valid digest,
  owner, timestamp, queue, payload, maximum, and schedule), start from a fully
  valid canonical row for each state, change exactly the intended cells, and
  prove each fixture is accepted after removing only its targeted invalidity.

### High — DWP-T6-H2: schema Red tests verify labels, not database semantics

- **File:**
  `packages/db/src/__tests__/durable-jobs-schema-migration.red.test.ts:137-169,220-257,259-302`
- **Evidence:** the suite checks that constraint names and column names occur in
  migration text. It does not execute `durableJobInvalidRowFixtures`, prove that
  valid canonical rows are accepted, or prove that a named check is stronger
  than `CHECK (true)`. The support-table check calls shapes “bounded” but does
  not assert types, nullability, bounds, primary/singleton keys, or all required
  uniqueness. It forbids sensitive columns only on
  `review_job_migration_issues`; extra payload, result, token, raw-error,
  provider-response, SQL, or URL columns on either audit table would still
  pass.
- **Impact:** Task 11 could make the Red suite Green with structurally named but
  unsafe SQL, defeating the accepted Task 5 truth table, audit minimization,
  and append-only contract.
- **Required remediation:** retain fast source checks only as a supplement.
  Add executable PG16 assertions that apply the migration, accept canonical
  valid rows, reject every corrected fixture for the intended invariant, and
  inspect catalog metadata for actual types, nullability, keys, bounds,
  privileges, trigger ownership, and forbidden audit columns.

### High — DWP-T7-H1: lifecycle locking has a parallel-start false-stale race

- **File:**
  `packages/backend/src/jobs/__tests__/postgres16-harness.ts:393-434`
- **Evidence:** the harness creates its scratch database while holding the
  advisory lock, releases that lock at line 417, and only then opens/probes the
  two scratch connections. A second harness invocation can acquire the lock in
  that interval, observe the first scratch database with no active session, and
  reject it as stale. No concurrent-invocation test covers this ordering.
- **Impact:** parallel Vitest workers or later Task 8/9 suites can fail
  nondeterministically even though both invocations are isolated and healthy.
- **Required remediation:** retain the lifecycle lock until the scratch
  database has an established tracked session (preferably both verified
  sessions), then add a two-invocation test proving unique databases and clean
  teardown without false stale detection.

### High — DWP-T7-H2: deterministic cleanup is not proven and SIGTERM can leak a database

- **Files:**
  `packages/backend/src/jobs/__tests__/postgres16-harness.ts:305-379,415-464`;
  `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts:14-100`
- **Evidence:** signal handlers are registered only at lines 451-452, after
  database creation and both connection probes. SIGINT/SIGTERM in that window
  follows the process default and can leave the generated database behind. The
  only live integration test exercises a successful lifecycle. There are no
  tests for migrate/setup/validation/test/teardown failure, additional-role
  connection cleanup, cleanup failure aggregation, stale-database refusal,
  version rejection, equal backend PIDs, or signal cleanup. The producer's own
  live coverage is 69.86% branches and 73.68% functions, below the project
  quality target and concentrated in these untested lifecycle branches.
- **Impact:** Task 7's required cleanup-under-failure guarantee is not accepted;
  leaked scratch databases then fail all subsequent harness runs closed.
- **Required remediation:** install cleanup-aware signal handling before the
  first destructive operation and add failure-injection/live cases for every
  lifecycle stage, including a subprocess signal case that proves zero
  remaining `durable_job_pg16_test_%` databases.

### Low — DWP-T6-L1: diff-check evidence is a placeholder, not an exact command

- **File:**
  `measure/tracks/durable_job_worker_platform_20260713/task-6-red-schema-counterexamples-20260722.md:74-87`
- **Evidence:** the recorded command is
  `git diff --check -- <three Task 6 test paths>`, so it is not directly
  reproducible. This reviewer reran the exact three source paths successfully.
- **Required remediation:** replace the placeholder with the literal paths and
  retain the terminal result.

### Low — DWP-T7-L1: safe-default test count is stale

- **File:**
  `measure/tracks/durable_job_worker_platform_20260713/task-7-postgresql16-harness-20260722.md:43-46`
- **Evidence:** the producer document says 22 passed/1 skipped. The current
  exact two-file run produced **26 passed/1 skipped**. This is documentation
  drift, not a runtime failure.
- **Required remediation:** update the count and record the exact environment-
  clearing command used for the safe-default proof.

## Separate task decisions

### Task 6 — FAIL

The fixture-integrity suite passes 4/4 and the intended schema contract fails
only for absent Task 11 platform artifacts (10 failed/1 passed), so the Red
signal is correctly located. TypeScript, ESLint, JSDoc/export coverage, exact
adapter-root enforcement, and whitespace checks pass. Task 6 nevertheless
remains blocked by `DWP-T6-H1` and `DWP-T6-H2`; its fixtures and migration tests
cannot yet prove the accepted schema semantics.

### Task 7 — FAIL

URL isolation is strong: no fallback exists; non-empty generic URLs, remote or
unsafe hosts, shared/default database names, parameters/fragments, ambiguous
opt-in, non-PG protocols, and non-PG16 servers fail closed. The implementation
creates unique database names, uses two independently PID-verified sessions,
orders hooks as `migrate -> setup -> legacyPreflight -> roleFence ->
auditPrivileges -> explainPlans -> test -> teardown`, tracks extra
role-specific connections, and drops only its generated database. The recorded
disposable PG16 receipt is consistent with the source and reports zero remaining
scratch databases without changing pre-existing containers.

Task 7 still fails acceptance because `DWP-T7-H1` makes concurrent starts
nondeterministic and `DWP-T7-H2` leaves destructive failure/signal cleanup
unproven. Task 8 must remain blocked.

## Verification checks

- **Plan/spec compliance:** Partial — intended boundaries are respected; the
  blocking semantic and cleanup guarantees above are not yet met.
- **Boundary leakage:** Pass — Task 6 adds test/evidence files only; Task 7 adds
  test-only backend harness files only. No production schema, migration,
  adapter, queue transition, worker loop, or Task 8/9 behavior is present.
- **JSDoc/export standards:** Pass — exported functions, constants, interfaces,
  type aliases, and interface members are documented. No caller compatibility
  issue exists because the exports are new test-only surfaces.
- **Task 6 fixture test:** 1 file, 4 passed.
- **Task 6 intentional Red:** 1 file failed; 10 failed/1 passed, all ten failures
  are missing schema/migration/registry artifacts rather than transform/import
  failures.
- **Task 7 safe default:** 1 file passed/1 skipped; 26 passed/1 skipped; all
  database URL and opt-in variables were explicitly removed.
- **Type checks:** `@reading-advantage/db` and
  `@reading-advantage/backend` passed.
- **Focused ESLint:** passed for all six Task 6/7 TypeScript files.
- **Whitespace:** exact eight producer source/evidence paths passed
  `git diff --check`.
- **Graph caller check:** N/A — all touched exports are additive, test-only, and
  have no production callers.
- **Browser check:** skipped; these are backend/test-infrastructure changes.
  If a browser check later becomes applicable, Kimi WebBridge is the required
  path.

## Required re-review gate

Remediate `DWP-T6-H1`, `DWP-T6-H2`, `DWP-T7-H1`, and `DWP-T7-H2`, correct the two
Low documentation errors, then obtain a fresh independent review over the exact
artifact set. Do not mark Tasks 6 or 7 complete and do not unlock Tasks 8 or 9
from this review.
