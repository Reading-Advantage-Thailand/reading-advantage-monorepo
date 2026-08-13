# Tasks 6–7 Independent Foundation Re-review — 2026-08-14

## Verdict

**Task 6: PASS. Task 7: PASS.** No open Critical, High, Medium, or Low finding remains in the reviewed artifacts.

The artifacts satisfy the Phase 2 foundation gate. The orchestrator can mark Tasks 6 and 7 complete and unlock Tasks 8 and 9.

This verdict accepts Red tests and test infrastructure only. It does not accept a production migration, a PostgreSQL adapter, queue behavior, or worker composition.

## Fixed review scope

Repository HEAD was `622c4c5dfd56a123acb188f58c6b558384efa287`. The reviewed files had these SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `packages/backend/src/jobs/__tests__/postgres16-harness.ts` | `1c7a244afabaf6741cd82efe25744389e5cb0e12281e305ba89ef173040e32fb` |
| `packages/backend/src/jobs/__tests__/postgres16-harness.test.ts` | `3b1abb42f247e66054dfbe8ad835305c9a0faee1ec5845046b953c2b5f915f20` |
| `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts` | `cbe5ac00a97b661ace4d7f064338524a9fcf36d89e5bc099f92e6a63bcd21b4a` |
| `packages/db/src/__tests__/durable-jobs-schema-migration.red.test.ts` | `3765e9674b62759eaa3f64e81e76f93823e03bc445b4ced9acab054512f5b47e` |
| `packages/db/src/__tests__/durable-jobs-schema-pg16.red.test.ts` | `bb4e1d61918b28da1d50e414b9547ff445e7407619f51813ab3813137f7958ff` |
| `packages/db/src/__tests__/durable-jobs-transition-fixtures.test.ts` | `eab6aa67a4c10c9017af2c55ef889ebc00f421eb9919b93012a08c6c1c1a6983` |
| `packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts` | `fc26c6f208d32809b37006ab20decdfa354dafe2429e98fb5690a97af9c1dfd3` |
| `task-6-red-schema-counterexamples-20260722.md` | `603525640da79516fc4e50efc53749390cc6db7af2f9b5d5f1d10d06c8fc18e0` |
| `task-7-postgresql16-harness-20260722.md` | `62d2c615ed3a076d8dfe8b28687451a3066d417a9f6a1956f2efaf657eeacb79` |

## Severity-ranked checklist

- **Critical:** None.
- **High:** None.
- **Medium:** None.
- **Low:** None.

The full backend test configuration still reports one finance test diagnostic. That file is outside this review scope and does not affect Task 7.

## Closed Task 6 findings

### DWP-T6-H1 — Closed

The fixtures now start from complete canonical state rows. They use valid digests, timestamps, queue values, payloads, and attempt limits.

The fixture tests restore every changed row to its canonical row. They enumerate all partial tuples and required truth-table exclusions.

Evidence: `durable-jobs-transition-fixtures.test.ts:82-203` and `durable-job-transition-counterexamples.ts:225-717`.

### DWP-T6-H2 — Closed

The opt-in test loads the frozen Task 7 harness only after explicit enablement. Generic database URLs fail before the live suite can skip.

Evidence: `durable-jobs-schema-pg16.red.test.ts:177-221` and `:746-766`.

The live contract checks exact support keys by constraint. Separate keys and wrong composite keys cannot satisfy the assertions.

Evidence: `durable-jobs-schema-pg16.red.test.ts:310-383`.

The catalog checks real columns, enum labels, checks, identity indexes, bounds, grants, owners, and triggers. Each audit table requires a runtime `INSERT` grant.

Evidence: `durable-jobs-schema-pg16.red.test.ts:486-683`.

The test accepts each canonical state row. It rejects every invalid fixture with SQLSTATE `23514` and the exact expected constraint name.

Evidence: `durable-jobs-schema-pg16.red.test.ts:685-742`.

### DWP-T6-L1 — Closed

The Task 6 evidence now contains literal lint and diff-check paths. Its recorded counts match the current safe and Red suites.

Evidence: `task-6-red-schema-counterexamples-20260722.md:69-140`.

## Closed Task 7 findings

### DWP-T7-H1 — Closed

The harness holds its advisory lock through database creation and both session probes. It releases the lock after it verifies distinct backend PIDs.

Evidence: `postgres16-harness.ts:601-664`.

The live suite proves concurrent unique databases. It also proves that a name collision does not delete the existing database.

Evidence: `postgres16-harness.integration.test.ts:255-345`.

### DWP-T7-H2 — Closed

The harness registers signal handling before its first database query. It uses a five-second grace period and then starts forced cleanup.

Evidence: `postgres16-harness.ts:43-89` and `:578-603`.

Cleanup closes tracked connections, terminates scratch sessions, and drops only an owned database. The created flag changes only after `CREATE DATABASE` succeeds.

Evidence: `postgres16-harness.ts:496-576` and `:623-624`.

The live suite covers all hook failures, extra connections, stale refusal, collisions, two concurrent harnesses, and signal windows. It includes an uncooperative hook.

Evidence: `postgres16-harness.integration.test.ts:313-652`.

### DWP-T7-L1 — Closed

The Task 7 evidence records the current safe count, live count, port, image, and cleanup result.

Evidence: `task-7-postgresql16-harness-20260722.md:43-89`.

## Requirement assessment

| Requirement | Result | Evidence |
|---|---|---|
| Real PostgreSQL 16 behavior | PASS | The fresh live Task 7 run passed 30 tests on `postgres:16-alpine`. The server guard rejects other major versions. |
| Complete constraint rejection | PASS for the Red contract | Task 6 enumerates each invalid fixture and requires SQLSTATE `23514` with the exact constraint name. |
| Isolated databases | PASS | Each harness call creates an owned `durable_job_pg16_test_%` database. Concurrent calls use distinct names. |
| Separate connections | PASS | The harness opens two clients and rejects equal backend PIDs. |
| Deterministic cleanup | PASS | Failure and signal tests end with zero scratch databases. A bounded forced path handles an uncooperative hook. |
| No unsafe URL fallback | PASS | Missing opt-in skips safely. Missing or unsafe dedicated URLs fail. Generic URLs fail before skip. |
| Scope boundary | PASS | The reviewed work adds tests and evidence only. It adds no production queue behavior. |

## Execution evidence

- A fresh Task 7 live run used PostgreSQL 16 on loopback port `55439`.
- The Task 7 live suites passed `30/30`.
- A post-run query found zero scratch databases.
- The Task 6 live run reached only the intentional missing Task 11 migration assertion.
- The Task 6 post-run query found zero scratch databases.
- The Task 6 safe suites passed eight tests and skipped one live test.
- The Task 7 safe suites passed 29 tests and skipped one live test.
- The isolated Task 6 and Task 7 TypeScript checks passed without incremental state.
- The database and backend production TypeScript checks passed.
- Focused ESLint and exact diff checks passed.

The Task 6 live test cannot execute its schema assertions until Task 11 supplies the migration. This intentional Red state does not weaken the foundation verdict.

## Planned omissions

Tasks 8 and 9 remain absent because the plan blocked them behind this review. Their missing concurrency and queue tests are not foundation defects.

`services/worker/src/worker-composition.ts` remains absent. Task 10 requires that missing module as its intentional Red result.

Task 15 owns production worker composition. This review does not require that future file.

## Exact future re-review scope

Re-review these Task 6 files if their hashes change:

- `durable-jobs-schema-pg16.red.test.ts`
- `durable-jobs-transition-fixtures.test.ts`
- `fixtures/durable-job-transition-counterexamples.ts`
- `durable-jobs-schema-migration.red.test.ts`

After Task 11 lands, run the Task 6 opt-in suite on a fresh PostgreSQL 16 container. Require all canonical rows and invalid fixtures to execute.

Re-review these Task 7 files if their hashes change:

- `postgres16-harness.ts`
- `postgres16-harness.test.ts`
- `postgres16-harness.integration.test.ts`

For a harness change, rerun the safe suite and the 30-test live suite. Query for zero scratch databases after each run.

For a URL-guard change, rerun missing opt-in, invalid opt-in, generic URL, remote host, shared database, and wrong-version cases.

Review Tasks 8 and 9 as separate Red contracts. Do not require their behavior from the accepted Task 6 and Task 7 foundation.

Review `worker-composition.ts` under Task 15. Do not reopen this foundation review because Task 10 still reports that file as missing.
