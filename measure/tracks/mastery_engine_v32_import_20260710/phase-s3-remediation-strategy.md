# Phase S3 Review Remediation Strategy

Baseline: `2bddadc7`  
Source audits: `phase-s3-review-correctness.json`,
`phase-s3-review-boundaries.json`, and `phase-s3-review-api.json`  
Rule: the remediation Red contracts land before production or migration changes.

## 1. One public application contract

- `commitMasteryEvidenceInputSchema`, its inferred
  `CommitMasteryEvidenceInput`, and `commitMasteryEvidence()` describe exactly
  one command. Remove the public union and the second incompatible transaction
  command.
- `MasteryPersistencePort` exposes `readSnapshot`,
  `commitMasteryEvidence`, and `approveMasteryCalibration`. Both the in-memory
  and Drizzle adapters implement this high-level port. Serializable transactions
  and write ordering are adapter-internal.
- The service parses once, derives a canonical request digest from the validated
  payload, and delegates to the port. Callers cannot assert their own digest.
  Request and result digests use `sha256:` followed by exactly 64 lowercase hex
  characters.
- School and mastery record IDs are UUIDs. User-backed `studentId` and `actorId`
  remain bounded opaque text because `users.id` is text. Objective, variant,
  source, request, idempotency, graph, contract, and parameter identifiers are
  bounded opaque strings.
- `MasteryPersistenceError` distinguishes validation, tenant scope,
  idempotency, append-only, revision, unavailable, timeout, missing-migration,
  and internal failures; it exposes retryability without provider error text.

## 2. DB-free exports and compatibility

Add explicit package subpaths:

- `@reading-advantage/domain/mastery/contracts`
- `@reading-advantage/domain/mastery/service`
- `@reading-advantage/domain/mastery/adapters/memory`
- `@reading-advantage/domain/mastery/adapters/drizzle`
- `@reading-advantage/domain/mastery/legacy`

The main mastery facade, contracts, service, and memory subpaths must not
evaluate DB, Drizzle, auth, `record-run.ts`, or a DB client. Preserve the
pre-S3 `recordRun`, `recordRunFailure`, `RateLimitError`, and rate-limit reset
surface through lazy or pure compatibility wrappers. Correct the unreleased S3
API rather than preserve an invalid union. Package cold-import tests run with DB
environment variables unset and fail on DB warnings or client initialization.

## 3. Tenant authority and immutable ownership

- Construct the Drizzle adapter with typed `{ db, tenant, actorId }`. Require a
  non-null `tenant.schoolId`, bind it immutably, create TenantDB internally, and
  reject every input whose school or audit actor differs before DB execution.
  SYSTEM/service work must first receive an explicitly authorized target-school
  context; it never receives an unscoped adapter.
- All FLAT operations and transaction callbacks use TenantDB. Tenant scope
  errors map to the portable tenant error.
- Add `users_school_id_id_unique` while keeping `users.schoolId` nullable.
  School-owned mastery rows reference `(school_id, student_id)` on users.
- Add `(school_id, id, student_id)` uniqueness on cards and reviews. Reviews
  reference the matching card tuple; evidence references the matching review
  tuple. CAS updates cannot change the existing owner/natural-key tuple.
- Real PGlite tests prove bound-school rejection, null-tenant rejection,
  cross-school user FK failure, card/review/evidence owner-chain failure, and
  same-school success.

## 4. Idempotency, concurrency, and calibration

- One canonical payload digest binds the key to the validated command. A changed
  payload with the same key always conflicts even if a caller supplies matching
  text elsewhere.
- The Drizzle adapter uses serializable transactions, card-before-review FK-safe
  ordering, immutable evidence/reviews/receipts, CAS predicates that include
  owner identity, and bounded retry/reload handling. Identical concurrent
  contenders resolve to one `applied` and one stable `replayed` receipt;
  serialization and stale revision failures remain typed and retryable.
- Calibration approval is a separate high-level port command carrying FSRS
  weights, population/version identity, review/student/training/holdout counts,
  candidate/incumbent evaluation metrics, mechanical gates, human approver,
  provenance, and audit context. Reject zero-volume, regressing, gate-failing,
  or actor/approver-mismatched artifacts before any transaction.
- Restore placement uniqueness on
  `(schoolId, studentId, objectiveId, graphRelease, evidenceType)` and calibration
  uniqueness on `(schoolId, domain, ageBand, paramsVersion)` in schema, SQL, and
  tests. Commands may omit unchanged placement/calibration rather than insert a
  duplicate on every learner-state revision.

## 5. Migration and snapshot policy

- Do not rewrite possibly applied `0027_mastery_persistence`.
- Reconstruct `0026_snapshot.json` from historical schema commit `bc792b68` in
  a temporary archived tree and `0027_snapshot.json` from `08e942a2` using the
  validated 0026 snapshot. Compare canonical JSON and SQL semantics; copy only
  matching snapshot files into the worktree and never overwrite a mismatch.
- Generate a new `0028` tenant-hardening migration, journal entry, and snapshot.
  It must fail closed on pre-existing cross-owner data rather than delete or
  reassign it, then add the composite user/card/review constraints and restored
  natural uniqueness.
- In a clean detached worktree, `drizzle-kit check` must pass and a new
  `drizzle-kit generate` must report no schema changes, create no files, and emit
  no duplicate `CREATE TABLE "mastery_..."` SQL.

## 6. Red oracle and file ownership

Red A owns new domain-only tests:

- `mastery-persistence-remediation-contract.test.ts`: one schema/type/function,
  canonical hashes, identifier parity, exact memory/Drizzle result parity,
  calibration invariants, typed errors, and >80% branch targets.
- `mastery-persistence-public-api.test.ts`: compile composition, package exports,
  DB-free cold imports, and legacy compatibility.

Red B owns new DB/PGlite tests:

- `mastery-persistence-tenant-adversarial.test.ts`: bound authority, owner FKs,
  immutable CAS, FK-safe transaction ordering, real duplicate race/replay,
  rollback, and provider-failure mapping.
- `mastery-persistence-migration-repro.test.ts`: frozen uniqueness, 0026/0027/0028
  snapshot chain, journal parity, preflight, and clean-generation contract.

The Red commit may update shared fixtures only to express the approved command;
it must not weaken any prior assertion. Each new test must fail for the audited
production reason and retain at least one passing control.

## 7. Parallel Green slices

1. Domain/public slice: canonical schemas, service, high-level port, in-memory
   adapter, DB-free barrels/subpaths, legacy wrappers, docs, and domain tests.
2. Database slice: users/mastery constraints, historical snapshots, new 0028
   migration/snapshot/journal, tenant coverage, and migration tests.
3. Integration slice after 1 and 2: authority-bound Drizzle adapter, real
   transactions/retries, parity/error mapping, and PGlite adversarial tests.

No slice may edit another slice's owned files without orchestrator handoff.

## 8. Gates

```bash
TZ=UTC pnpm exec vitest run packages/domain/src/__tests__/mastery-persistence*.test.ts packages/db/src/__tests__/mastery-persistence*.test.ts --maxWorkers=1
pnpm --filter @reading-advantage/domain check-types
pnpm --filter @reading-advantage/domain lint
pnpm --filter @reading-advantage/domain build
pnpm --filter @reading-advantage/db check-types
pnpm --filter @reading-advantage/db lint
pnpm --filter @reading-advantage/db build
pnpm --dir packages/db exec drizzle-kit check --config drizzle.config.ts
build-graph update ./graph.db packages/domain/src/mastery packages/db/src/schema/mastery.ts packages/db/src/schema/users.ts
```

Focused executable coverage must exceed 80% for statements, branches,
functions, and lines. Phase S3 remains open until all three independent reviews,
phase acceptance, and adversarial testing pass. Browser review is explicitly
not applicable because this phase has no route, component, or user-visible UI.
