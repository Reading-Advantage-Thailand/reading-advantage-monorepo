# Test strategy: Durable Job Worker Platform

> Canonical strategy for Phase 2 (Red Concurrency and Failure Tests) of
> `durable_job_worker_platform_20260713`. Phase 1 is accepted. The original
> Task 6 and Task 7 review failed at `b32cc7f2f`. The 2026-08-14 re-review
> accepted both remediated tasks. Task 8 has an assigned Red owner. Task 9
> remains blocked until its owner creates accepted Red evidence. This role owns
> no product source and no test source.

## Phase scope and hard boundaries

| Phase                                                   | State                                                              | Risk              | This strategy                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ----------------- | ---------------------------------------------------- |
| Phase 1 - existing behavior contract and generic schema | Accepted (Tasks 1-5; design PASS at `fb8c0d99`)                    | high (historical) | Reference and regression baseline only; not reopened |
| Phase 2 - Red concurrency and failure tests             | Active; Tasks 6/7 `[x]`; Task 8 `[~]`; Task 9 `[b]`; Task 10 `[~]` | high              | Full strategy below                                  |
| Phase 3 - PostgreSQL adapter implementation             | `[b]` behind Phase 2 acceptance                                    | critical          | Future Red/Green shape only                          |
| Phase 4 - worker service and `review_jobs` adoption     | `[b]` behind Phase 3 acceptance                                    | critical          | Future Red/Green shape only                          |
| Phase 5 - capability integration, docs, doctor          | `[b]` behind Phase 4 and kernel acceptance                         | high              | Future Red/Green shape only                          |

Hard boundaries for Phase 2:

- Phase 2 adds test code and test evidence only. It adds no production schema,
  migration, PostgreSQL role or trigger, adapter, queue transition, or worker
  loop.
- Queue persistence SQL may exist only under
  `packages/backend/src/jobs/adapters/postgres/`. Phase 2 tests must not create
  that root.
- `services/worker` must not import DB clients, Drizzle schema, SQL, or job
  tables. Phase 2 architecture tests assert this boundary.
- No production, shared, or default database is touched. All live locking proof
  uses the disposable PG16 environment defined below.
- The proven `review_jobs` behavior from Phase 1 is a regression baseline. Phase
  2 changes nothing under `packages/webhooks`, `packages/domain`, or
  `packages/api`.

## Remediation contract for independent FAIL `b32cc7f2f`

The review `task-6-task-7-independent-review-20260722.md` returned FAIL for both
tasks. Each finding has one exact remediation and one falsifier.

### DWP-T6-H1 - partial-tuple fixtures fail before the intended constraint

- Remediation: build column-aware canonical values (valid SHA-256 digest, lease
  owner, timestamp, queue, payload, maximum, schedule). Start each fixture from
  a fully valid canonical row for its state. Change exactly the intended cells.
- Proof: each corrected fixture is accepted after only its targeted invalidity
  is removed.
- Falsifier: a PostgreSQL insertion rejects a fixture for input conversion or a
  format check before the claimed `expectedConstraint` fires.

### DWP-T6-H2 - schema Red tests verify labels, not database semantics

- Remediation: keep the fast source checks as a supplement only. Add executable
  PG16 assertions that apply the migration, accept canonical valid rows, and
  reject every corrected fixture for the intended invariant. Inspect catalog
  metadata for real types, nullability, keys, bounds, privileges, and trigger
  ownership. Extend the forbidden-column check to both audit tables for payload,
  result, token, raw-error, provider-response, SQL, and URL columns.
- Falsifier: a migration with structurally named but semantically `CHECK (true)`
  constraints makes the suite Green.

### DWP-T6-L1 - placeholder diff-check evidence

- Remediation: replace `git diff --check -- <three Task 6 test paths>` in
  `task-6-red-schema-counterexamples-20260722.md` with the three literal paths
  and the terminal result.
- Falsifier: the recorded command is not directly reproducible.

### DWP-T7-H1 - lifecycle locking has a parallel-start false-stale race

- Remediation: hold the lifecycle advisory lock until the scratch database has
  an established tracked session, preferably both verified sessions. Add a
  two-invocation concurrency test that proves unique databases and clean
  teardown without false stale detection.
- Falsifier: two concurrent harness invocations reject a healthy scratch
  database as stale.

### DWP-T7-H2 - deterministic cleanup is not proven for failure and signal paths

- Remediation: install cleanup-aware signal handlers before the first
  destructive operation. Add failure-injection and live cases for every
  lifecycle stage: migrate, setup, validation, test, and teardown failure;
  additional-role connection cleanup; cleanup failure aggregation; stale
  database refusal; version rejection; equal backend PIDs; and signal cleanup.
  Add one subprocess signal case that proves zero remaining
  `durable_job_pg16_test_%` databases.
- Falsifier: a SIGINT/SIGTERM during setup leaves a scratch database behind, or
  the branch/function coverage for lifecycle error paths stays unexercised.

### DWP-T7-L1 - stale safe-default test count

- Remediation: update `task-7-postgresql16-harness-20260722.md` from
  22 passed/1 skipped to the reviewer's reproduced 26 passed/1 skipped. Record
  the exact environment-clearing command from the safe-default section below.
- Falsifier: rerunning the exact two-file command produces a different count
  than the document records.

## Execution sequence and authorization

1. Task 7 harness API freeze comes first. The remediated harness API is the
   dependency for the Task 6 executable PG16 assertions required by DWP-T6-H2.
2. Task 6 PG16 executable assertions come second. They consume the frozen Task 7
   harness API and the corrected DWP-T6-H1 fixtures.
3. Task 10 Red is authorized in parallel after this strategy commit. Task 10
   tests worker lifecycle and architecture boundaries. It does not consume the
   PG16 harness and does not wait for Tasks 6/7.
4. The fresh independent re-review passed on 2026-08-14. It accepted the exact
   Task 6 and Task 7 artifacts.
5. Tasks 6 and 7 are complete. Task 8 has an assigned Red owner. Task 9
   remains blocked until its owner creates accepted Red evidence.

## Leases

| Role                        | Exact lease                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Task 7 remediation producer | `packages/backend/src/jobs/__tests__/postgres16-harness.ts`, `postgres16-harness.test.ts`, `postgres16-harness.integration.test.ts`, and `measure/tracks/durable_job_worker_platform_20260713/task-7-postgresql16-harness-20260722.md`                                                                                               |
| Task 6 remediation producer | `packages/db/src/__tests__/durable-jobs-schema-migration.red.test.ts`, `durable-jobs-transition-fixtures.test.ts`, `fixtures/durable-job-transition-counterexamples.ts`, any new `packages/db/src/__tests__/*pg16*.test.ts`, and `measure/tracks/durable_job_worker_platform_20260713/task-6-red-schema-counterexamples-20260722.md` |
| Task 10 Red producer        | new Red files under `services/worker/src/__tests__/`, plus one new evidence note under the track directory                                                                                                                                                                                                                           |
| Independent re-reviewer     | read-only on all source; writes one new review note under the track directory                                                                                                                                                                                                                                                        |
| Strategy/orchestrator       | `measure/tracks/durable_job_worker_platform_20260713/**` only                                                                                                                                                                                                                                                                        |

No role touches the pnpm lockfile, root files, the tenant registry, generated
facts, `graph.db`, or any other track. Shared harness edits by the Task 6
producer are forbidden; the Task 7 producer owns the harness files alone.

## Disposable PG16 environment safety

Live locking tests run only against a disposable PostgreSQL 16 environment.

- Required opt-in: `DURABLE_JOB_PG16_TEST_OPT_IN=1`.
- Required URL: `DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL` with a `postgres:` or
  `postgresql:` protocol, a loopback host, an explicit test role, no URL
  parameters or fragment, and a database named `durable_job_test_admin_*`.
- Fail-closed guards: any non-empty `DATABASE_URL` or
  `DIRECT_DATABASE_URL` aborts the run. Missing or ambiguous opt-in, non-loopback
  hosts, shared or default database names including `postgres`, and any
  PostgreSQL major other than 16 all fail closed. There is no fallback.
- Isolation: each invocation creates one unique `durable_job_pg16_test_%`
  database and verifies two distinct backend PIDs. Stale scratch databases fail
  closed and are never deleted automatically.
- Disposable container: a uniquely named `docker.io/library/postgres:16-alpine`
  container on a random loopback port. It is stopped and removed after the run.
  Pre-existing containers, servers, and databases are never reused or modified.
- Cleanup proof: a post-run query must return zero `durable_job_pg16_test_%`
  databases, including after failure-injection and subprocess signal cases.

Safe-default proof command (exact, environment-clearing):

```bash
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-harness.test.ts \
    src/jobs/__tests__/postgres16-harness.integration.test.ts
```

Expected at safe default: 29 passed, 1 skipped, exit 0, and no PostgreSQL
contact. A different count or any database contact falsifies the safe default.

## Phase 2 tasks

### Task 6 - Red schema/migration/tenant-registry tests and counterexamples (accepted)

Targeted Red commands:

```bash
# Intentional Red schema contract (source checks plus, after remediation,
# executable PG16 assertions behind the harness opt-in).
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/durable-jobs-schema-migration.red.test.ts

# Fixture integrity (Green support gate).
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/durable-jobs-transition-fixtures.test.ts
```

Green gate for Task 6:

- The fixture-integrity suite passes with every fixture built from a canonical
  valid row (DWP-T6-H1 remediation).
- The Red suite fails only on missing Task 11 platform artifacts. Every failure
  names a missing schema, migration, registry, or privilege object. No failure
  is an import, transform, type, or fixture-construction error.
- The executable PG16 assertions pass their positive arm on a scratch database
  only when run with the harness opt-in. The safe-default run skips them.
- `pnpm --filter @reading-advantage/db check-types`, focused ESLint on the Task
  6 files, and `git diff --check` with literal paths pass.

Closeout gate for Task 6: a fresh independent re-review over the exact
remediated artifact set returns PASS with DWP-T6-H1, DWP-T6-H2, and DWP-T6-L1
closed and no new Critical/High finding.

### Task 7 - deterministic isolated PG16 harness (accepted)

Targeted Red/live commands:

```bash
# Safe default (see the exact env-clearing command above): 29 passed/1 skipped.
# Live PG16 against the disposable container:
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgres://<test-role>@127.0.0.1:<port>/durable_job_test_admin_local \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-harness.test.ts \
    src/jobs/__tests__/postgres16-harness.integration.test.ts
```

Green gate for Task 7:

- The lifecycle lock is held until both scratch sessions are established and
  tracked (DWP-T7-H1 remediation). The two-invocation concurrency test passes.
- Cleanup-aware signal handlers are installed before the first destructive
  operation (DWP-T7-H2 remediation). Every lifecycle failure-injection case and
  the subprocess signal case pass with zero remaining scratch databases.
- The safe-default count is 29 passed/1 skipped and the evidence document
  records the same count and the exact env-clearing command (DWP-T7-L1).
- Live evidence names the disposable image, the unique database, and the zero
  remaining scratch databases query result.

Closeout gate for Task 7: a fresh independent re-review returns PASS over URL
safety, cleanup under failure and signal, exact hook order, two-session
independence, PG16 enforcement, and secret-safe errors.

### Task 8 - Red concurrency and reclaim tests (owned; Red in progress)

Task 8 is `[~]` after the Task 6/7 re-review PASS. Its targeted Red command
runs on the frozen harness:

```bash
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=<guarded-url> \
  CI=true pnpm --filter @reading-advantage/backend exec vitest run \
    src/jobs/__tests__/postgres16-concurrency.red.test.ts
```

Required Red assertions: concurrent `FOR UPDATE SKIP LOCKED` claims never own
the same active lease; a fresh worker captures token, expiry, state, result, and
error before heartbeat, settle, and fail reject the first worker's exact stale
token without mutation; a fresh verifier SQL session compares the persisted
token digest, expiry, state, result, and error, with result and error absent;
global, company, and school scopes cannot claim or
mutate another tenant's job, including reverse tenant access to global jobs;
concurrent reclaim across independent sessions has one winner; and a fresh
adapter and session preserve restart progress. Expected failure mode at Red:
the adapter root does not exist, so suites fail on missing platform behavior,
not on harness defects.

### Task 9 - Red enqueue/retry/DLQ/replay tests (blocked)

Task 9 remains `[b]` until its owner creates accepted Red evidence. Required
Red assertions: duplicate enqueue returns the same durable identity within
declared scope; retry timing is bounded and deterministic under test control;
exhausted jobs dead-letter; replay requires authorization evidence, rejects an
active lease, and emits one safe audit event. Expected failure mode: missing
adapter behavior only.

### Task 10 - Red worker lifecycle and architecture tests (authorized in parallel)

Task 10 starts after this strategy commit. Targeted Red command shape:

```bash
CI=true pnpm --filter @reading-advantage/worker exec vitest run \
  src/__tests__/worker-lifecycle.red.test.ts \
  src/__tests__/worker-architecture.red.test.ts
```

Required Red assertions: typed handler registration; bounded concurrency and
polling; startup env validation; health/readiness transitions; SIGTERM drain;
safe structured logs with no payload secrets; job-port-only access; zero direct
DB, schema, SQL, or job-table imports under `services/worker`; queue
persistence confined to the exact backend adapter root. The producer records
each expected failure as a named missing worker-loop or composition module.
Task 10 must not touch the PG16 harness, `packages/db`, or the Task 6/7 files.

## Phase 2 verification, Green gate, and closeout gate

Phase verification command (from the plan):

```bash
CI=true pnpm vitest run packages/backend/src/jobs/__tests__ services/worker/src/__tests__
```

Phase 2 Green gate:

- Every Task 6/8/9/10 Red suite fails only on named missing platform behavior.
- All support gates pass: fixture integrity, harness safe default, Task 1
  worker suites, focused typecheck and ESLint, and exact-path `git diff --check`.
- The Phase 1 regression baseline still passes:
  `CI=true pnpm --filter @reading-advantage/webhooks test -- review-worker github-webhook-ack-latency github-webhook-idempotency`
  and `CI=true pnpm --filter @reading-advantage/db test -- phase-1-review-jobs`.

Phase 2 closeout gate:

- Fresh independent re-review PASS for Tasks 6 and 7, and a fresh independent
  review for the Task 10 Red set, each recorded as a track note.
- Live PG16 evidence satisfies acceptance criteria 2 and 9: isolated PG16, two
  independent connections, deterministic migration teardown, and fail-closed
  URL handling.
- The orchestrator anti-pattern audit covers this phase before acceptance.

## Phase 3 - future shape (critical)

Red command: the Phase 2 Task 6/8/9 suites re-run after the adapter lands; they
must flip from missing-behavior Red to Green only through real PostgreSQL
semantics. Green gate: acceptance criteria 2, 3, and 4 pass on the disposable
PG16 environment, plus migration governance and tenant-registry coverage gates.
Closeout gate: independent concurrency and failure-mode review with no open
Critical/High. Risk is critical because lease-token CAS and claim correctness
protect every future queue consumer.

## Phase 4 - future shape (critical)

Red command: worker composition, dual-run/shadow equivalence, restart, and
rollback-drill suites before the old polling path is touched. Green gate:
acceptance criteria 1 and 5 through 7 pass, plus the Cloud Run and ECS/Fargate
OCI validation of one provider-neutral image. Closeout gate: compatibility
evidence shows proven `review_jobs` behavior preserved, the replay tightening
and audit event called out as accepted changes, and rollback evidence recorded.
Risk is critical because this phase changes the proven production path.

## Phase 5 - future shape (high)

Red command: capability-binding suites that invoke only the accepted kernel
executor. Green gate: acceptance criterion 8 passes after kernel acceptance.
Closeout gate: full lint, typecheck, test, architecture, and doctor gates plus
the independent security, tenancy, and failure-mode review. If the kernel is
not accepted, Task 18 and AC-8 stay blocked with no false capability claim.

## Fixtures, mocks, and live-behavior proof expectations

Fixtures:

- `packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts`
  holds the invalid-row inventory. After DWP-T6-H1 remediation, each fixture
  derives from a canonical valid row and changes only its targeted cells.
- Canonical valid rows per state are the positive arm of the executable PG16
  assertions.

Mocks:

- The PG16 locking, concurrency, reclaim, retry, DLQ, and replay proofs use no
  database mocks. They require the real disposable PG16 server and two real
  connections.
- Task 10 worker lifecycle tests may fake the job port with a typed in-memory
  port double. They must not mock the architecture-import static guards.

Live-behavior proof:

- DWP-T6-H2 executable assertions apply the real migration on a scratch
  database and inspect real catalog metadata.
- DWP-T7-H1/H2 proofs run real concurrent invocations and real subprocess
  signals.
- Task 8/9 proofs execute real lock orders, real reclaim timing, and real
  restart cycles on the disposable server.

## Artifact/documentation tests vs live behavior tests

Artifact and documentation tests assert shapes without a database: migration
text labels, fixture inventory counts, export and JSDoc coverage, adapter-root
enforcement, and evidence-document command accuracy (DWP-T6-L1, DWP-T7-L1).
They are falsified by a renamed constraint, a wrong count, or a
non-reproducible command.

Live behavior tests execute against the disposable PG16 server: canonical-row
acceptance, per-fixture rejection, catalog metadata inspection, two-invocation
concurrency, failure-injection cleanup, and signal cleanup. They are falsified
by a wrong rejection reason, a false stale detection, or a leaked scratch
database. No live behavior claim may rest on an artifact test alone (the
DWP-T6-H2 defect class).

## Architecture guardrails

- Queue persistence SQL exists only under
  `packages/backend/src/jobs/adapters/postgres/`. The existing adapter-root
  enforcement assertion must stay Green.
- `services/worker` imports no DB client, schema, SQL, or job table. Task 10
  architecture tests add a static guard for this.
- New durable tables carry a tenant-registry classification. Unclassified new
  tables fail `tenant-coverage` as a build failure.
- Persisted errors carry `code` and `safeSummary` only. No payload secrets,
  provider responses, or raw error text persist.
- Audit tables are append-only with a `NOLOGIN` owner, revoked `PUBLIC`, and
  rejecting update/delete/truncate triggers on both tables.

## Changed-contract risks

1. Harness API freeze: Task 6 PG16 assertions bind to the Task 7 harness API.
   A later harness signature change breaks Task 6 suites. Mitigation: freeze
   the harness API in the Task 7 remediation commit; Task 6 authors against
   that commit.
2. Fixture rebuild: DWP-T6-H1 changes fixture construction. The Task 9 race
   scenarios that consume those fixtures must be re-checked when Task 9
   unblocks.
3. Safe-default count: DWP-T7-L1 shows counts drift. Every count claim in a
   plan or evidence note must be reproducible by the recorded exact command.
4. Signal-handler ordering: DWP-T7-H2 moves handler registration earlier.
   Early handlers must still allow the ordered hook sequence to run.

## Intentionally-red aggregate-suite handling

The repository aggregate `pnpm turbo run test` and `pnpm turbo run lint` are
intentionally red from pre-existing failures outside this track (the 49
primary-advantage ESLint errors, mixed Jest/Vitest runners, Prisma remnants).
Phase 2 uses only the focused commands above. The Task 6 Red suite stays out of
any package-wide Green claim until Task 11. No Phase 2 role edits files outside
its lease to chase aggregate reds. This is the A7 defense: focused filters keep
a real Phase 2 regression visible inside pre-existing red noise.

## Review applicability

| Phase         | Security review                                                                                  | UX/API review                                                                 | Adversarial testing                                                                                                | Browser review                           |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 1 (reference) | Regression baseline only                                                                         | No                                                                            | No                                                                                                                 | No                                       |
| 2             | Yes: fail-closed URL guards, secret-safe errors, audit-column minimization, append-only triggers | Partial: the frozen harness API and the job-port boundary are the API surface | Yes: URL injection, false-stale races, signal cleanup leaks, wrong-reason fixture rejections, partial-tuple bypass | No: backend and test infrastructure only |
| 3             | Yes: lease CAS, claim locking, privilege and trigger enforcement                                 | Partial: adapter port contract                                                | Yes: concurrent claim, stale token, replay race, retry exhaustion                                                  | No                                       |
| 4             | Yes: adoption fencing, rollback, replay authorization and audit                                  | Partial: admin replay contract                                                | Yes: dual-run divergence, restart loss, old-path removal                                                           | No                                       |
| 5             | Yes: capability policy, tenancy, audit                                                           | Partial: catalog entries                                                      | Yes: executor bypass attempts                                                                                      | No                                       |

Any later browser check uses Kimi WebBridge only.

## Anti-pattern coverage

Phase 2 defenses (every defense has a falsifier):

| Anti-pattern                   | Defense                                                                                                        | Falsifier                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A3 digit-only count            | Every test-count claim is a labeled count bound to an exact command (29 passed/1 skipped; 10 failed/1 passed). | The recorded command prints a different count.                |
| A4 vacuous pass                | Each Red suite must fail on named missing platform objects. An all-pass Red phase is a failure.                | A Red suite exits zero before Task 11 lands.                  |
| A5 false claim vs test reality | Evidence notes cite literal commands with terminal results (DWP-T6-L1, DWP-T7-L1 remediations).                | Rerunning the cited command exits differently.                |
| A6 registry overstatement      | `tracks.md` and plan notes call Tasks 6/7 complete only after the fresh re-review PASS.                        | The re-review file records FAIL while the plan shows `[x]`.   |
| A7 over-broad filter           | Focused package filters only; no aggregate turbo gate for this phase.                                          | A Phase 2 regression hides inside pre-existing aggregate red. |
| A8 marker ambiguity            | Plan uses only `[x]`, `[~]`, `[b]` markers; Tasks 8/9 remove obsolete deferrals after PASS.                    | `tests/orchestrator_marker_vocabulary.sh` fails.              |
| A10 generated-facts drift      | This strategy changes no structural source; no generated-facts refresh is claimed.                             | `measure/doctor.sh` Check 5 attributes drift to this track.   |
| A14 invalid ripgrep option     | Audit recipes use `rg -n`, never `rg -nE`.                                                                     | A detector exits 2 and is reported as failure, not zero hits. |
| A15 stale role receipts        | Remediation commits require fresh receipts with current output hashes.                                         | `tests/orchestrator_role_receipt_integrity.sh` fails.         |
| A16 one worktree               | All roles work in the single master checkout and stage leased files only.                                      | `git worktree list` shows more than one worktree.             |

Phase 1 reference: A5/A6 guards keep the accepted Phase 1 evidence immutable;
this strategy cites it without restating live claims.

Phase 3 forward: A4 (adapter Greens must come from real PG16 semantics, not
label checks; this is the DWP-T6-H2 defense carried forward), A5, A7.

Phase 4 forward: A5 (compatibility claims must cite executed dual-run
evidence), A6 (no cutover claim before rollback evidence exists).

Phase 5 forward: A5/A6 (no capability claim while the kernel is unaccepted),
A10 (catalog and doctor freshness at closeout).

## phase_base_sha capture point

Do not embed any base SHA in this strategy. The `role_base_sha`
`1129427fbdb17c214fd55c086d60e62c7a4e1b7f` predates the strategy commit and is
invalid as a phase base. The orchestrator must capture the immutable
`phase_base_sha` exactly once, after both of these commits exist:

1. the strategy commit that adds this `test-strategy.md`; and
2. the evidence commit that adds the plan checkpoint note and the strategy
   role log.

Capture procedure: confirm both commits are on `master`, confirm no track-owned
path is dirty, then run `git rev-parse HEAD` at the evidence commit and record
that value as `phase_base_sha` in the orchestrator state. All Phase 2 diff
guards, including the no-shared-file guards, diff against that SHA.

## Falsifiability summary

- Task 6 Red: a migration with named-but-weak constraints must stay Red.
  Falsifier: the suite passes on `CHECK (true)` semantics.
- Task 6 fixtures: a fixture rejected for the wrong reason fails the
  remediation proof. Falsifier: insertion dies on input conversion first.
- Task 7 concurrency: false stale detection fails the two-invocation test.
  Falsifier: a healthy scratch database is rejected.
- Task 7 cleanup: any leaked `durable_job_pg16_test_%` database after failure
  or signal fails the run. Falsifier: the post-run count is non-zero.
- Safe default: missing opt-in must skip live suites without PostgreSQL
  contact. Falsifier: a connection attempt occurs.
- Task 10: worker suites must fail only on missing composition modules.
  Falsifier: a failure traces to a DB import or harness defect.
- Aggregate: focused commands stay authoritative. Falsifier: a Phase 2
  regression appears only in the aggregate run.
