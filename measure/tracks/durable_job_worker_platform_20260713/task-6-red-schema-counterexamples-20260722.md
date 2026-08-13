# Task 6 Red Schema and Invalid-Transition Counterexamples — 2026-07-22

## Scope and status

**Producer evidence only; independent review is still required.** Task 6 adds
deterministic Red source-contract tests and counterexample fixtures for the
accepted Task 5 schema/adoption design. It adds no production Drizzle schema,
migration, PostgreSQL role/trigger, adapter, worker behavior, or credential.
It consumes the frozen Task 7 harness through a test-only runtime import. It
does not modify the harness. Task 6 remains in progress until a fresh reviewer
accepts this exact artifact set.

## Red contract surface

The source-contract suite requires:

- one governed durable-jobs migration and a dedicated database jobs schema;
- the complete `durable_jobs` row, with only a SHA-256 lease-token digest and
  no persisted raw lease token;
- every named tenant, attempt, generation, lease, safe-error, rerun,
  redelivery, state-truth-table, name/key/worker/error/hash check;
- separate global and tenant partial unique identities that exclude queue;
- both due-claim indexes, all four queue/no-queue reclaim indexes, and both
  dead-list indexes in the reviewed column order;
- complete replay-audit, adoption-audit, bridge, singleton control, and
  redacted migration-issue shapes;
- allowed adoption edges without a direct `legacy <-> generic` edge;
- a `NOLOGIN` audit owner, revoked `PUBLIC`, insert-only runtime privilege,
  fixed-search-path trigger functions, and rejecting update/delete/truncate
  triggers for both audit tables;
- `REFERENTIAL` tenant-registry classification for every mixed-scope table;
- the exact queue-SQL root
  `packages/backend/src/jobs/adapters/postgres/` and no broader backend root.

## PG16 executable contract

The opt-in PG16 test applies the legacy `0025_review_jobs.sql` prerequisite and
the exact Task 11 durable-jobs migration in one scratch database. It accepts
the canonical row for each state. It rejects every invalid fixture with SQLSTATE
`23514` and the fixture's `expectedConstraint` name.

The test queries PostgreSQL catalog data. It verifies durable row types,
nullability, enum labels, keys, index predicates, check definitions, and audit
column minimization. It verifies support-table types and nullability. It also
verifies each ordered key, singleton rule, required uniqueness, and length
bound. It rejects flattened or separate keys that imitate a composite key. It
requires an audit-table runtime `INSERT` grant. It permits only `INSERT` and
scoped `SELECT`. It verifies `PUBLIC` grants, owners, and trigger ownership
through `information_schema.table_privileges` and `pg_catalog`.

The safe default clears all database URL variables. It runs two environment
guards and skips the live assertion. A non-empty `DATABASE_URL` or
`DIRECT_DATABASE_URL` fails before the live assertion can skip. The test loads
the Task 7 harness only after an explicit opt-in.

The invalid-row fixture inventory enumerates every partial lease tuple (6),
every partial five-column rerun tuple (30), both partial safe-error tuples, and
every forbidden state cell for lease/result/error/completion/rerun/redelivery
and attempt. It freezes the Task 4 versus database dead-attempt-zero decision.
It also freezes `T5-H1` first claim, business retry, repeated expiry,
max-attempt crash redelivery, replay reset, and rerun reset, plus `T5-H3`
queue moves, lower/raised maxima, complete last-commit-wins snapshots, and both
lock orders for settle/enqueue, fail/enqueue, and reclaim/enqueue. Task 9 owns
live adapter execution of those race scenarios.

Task 6 freezes the schema/declaration portions of `T5-H4` through `T5-H6`:
control/bridge/issue/audit shapes, allowed control edges, and database-enforced
append-only declarations. Task 7/9 still own actual runtime-credential,
preflight, fence, privilege-negative, and transaction-rollback proofs.

## Commands and observed results

Green fixture integrity:

```text
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/durable-jobs-transition-fixtures.test.ts
Test Files 1 passed (1); Tests 6 passed (6)
```

PG16 safe-default gate:

```text
env -u DURABLE_JOB_PG16_TEST_OPT_IN \
    -u DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL \
    -u DATABASE_URL \
    -u DIRECT_DATABASE_URL \
  CI=true pnpm --filter @reading-advantage/db exec vitest run \
    src/__tests__/durable-jobs-schema-pg16.red.test.ts
Test Files 1 passed (1); Tests 2 passed | 1 skipped (3)
```

Authorized PG16 Red gate:

```text
DURABLE_JOB_PG16_TEST_OPT_IN=1 \
DURABLE_JOB_PG16_TEST_ADMIN_DATABASE_URL=postgresql://durable_test@127.0.0.1:55439/durable_job_test_admin_local \
  CI=true ../../node_modules/.bin/vitest run \
    src/__tests__/durable-jobs-schema-pg16.red.test.ts
Test Files 1 failed (1); Tests 1 failed | 2 passed (3)
```

The live suite loaded the Task 7 harness and connected to PostgreSQL 16. Its
only failure reported the absent Task 11 migration. The post-run catalog query
found zero `durable_job_pg16_test_%` databases.

Intentional Red schema contract:

```text
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/durable-jobs-schema-migration.red.test.ts
Test Files 1 failed (1); Tests 10 failed | 1 passed (11)
```

All ten failures are named missing-platform assertions: migration/journal,
schema module/export, durable table/columns, named checks, two partial unique
identities, claim/reclaim/dead indexes, adoption object shapes, control edges,
append-only role/trigger declarations, and tenant classification. The one
passing assertion proves the exact PostgreSQL adapter root is already enforced.
There was no import, transform, TypeScript, setup, or unrelated runtime failure.

Meaningful non-Red gates:

```text
../../node_modules/.bin/tsc --noEmit --incremental false \
  -p tsconfig.json --pretty false
PASS

pnpm exec eslint \
  src/__tests__/durable-jobs-schema-pg16.red.test.ts \
  src/__tests__/durable-jobs-schema-migration.red.test.ts \
  src/__tests__/durable-jobs-transition-fixtures.test.ts \
  src/__tests__/fixtures/durable-job-transition-counterexamples.ts
PASS (from packages/db)

git diff --check -- \
  packages/db/src/__tests__/durable-jobs-schema-pg16.red.test.ts \
  packages/db/src/__tests__/durable-jobs-schema-migration.red.test.ts \
  packages/db/src/__tests__/durable-jobs-transition-fixtures.test.ts \
  packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts \
  measure/tracks/durable_job_worker_platform_20260713/task-6-red-schema-counterexamples-20260722.md
PASS
```

## Boundary and next gate

The Red suite is deliberately not included in a package-wide Green claim.
Task 11 may make it Green only by adding the reviewed Drizzle schema/migration,
tenant classifications, indexes, sentinels, roles, privileges, and triggers.
Task 7 owns the separate isolated PostgreSQL 16 harness and must not be folded
into this evidence. No Task 6 file is staged or committed by this producer.
