# Phase S3 Test Strategy: Portable Mastery Persistence

Baseline: `b7b8152f`  
Story: S3, portable persistence adapters  
Rule: contracts and Red tests land before schema, migration, or adapter implementation.

## 1. Scope and invariants

- Persist cards, reviews, evidence, objective state, placement, calibration, and atomic commits.
- PostgreSQL/Drizzle is an adapter; engine algorithms and port contracts import no Drizzle, DB, app, or transport code.
- Every record is school-owned. All seven tables are `FLAT`, carry non-null `schoolId`, and are registered before migration generation.
- Runtime inputs and outputs are strict Zod schemas; exported types are inferred from them.
- A submission commit is atomic and idempotent: evidence, review, card, state, audit metadata, and commit receipt either all persist once or none persist.
- No validated evidence means no transaction and no card/mastery mutation.
- Deterministic tests inject clock, IDs, graph release, contract version, and parameter version.

## 2. Exact owner files

| Concern | Owner file |
|---|---|
| Zod records, commands, results, provenance | `packages/domain/src/mastery/persistence-contracts.ts` |
| Provider-neutral storage interfaces | `packages/domain/src/mastery/persistence-ports.ts` |
| Atomic orchestration and authorization inputs | `packages/domain/src/mastery/commit-evidence.ts` |
| In-memory reference adapter | `packages/domain/src/mastery/in-memory-mastery-persistence.ts` |
| Drizzle adapter | `packages/domain/src/mastery/drizzle-mastery-persistence.ts` |
| Domain exports | `packages/domain/src/mastery/index.ts`, `packages/domain/src/index.ts` |
| Seven Drizzle tables and relations | `packages/db/src/schema/mastery.ts` |
| DB schema export | `packages/db/src/schema/index.ts` |
| Tenant classifications | `packages/domain/src/tenant-registry.ts` |
| Generated migration | `packages/db/drizzle/<generated>_mastery_persistence.sql` |
| Shared adapter contract | `packages/domain/src/__tests__/mastery-persistence.contract.ts` |
| In-memory conformance | `packages/domain/src/__tests__/mastery-persistence.in-memory.test.ts` |
| Drizzle conformance | `packages/domain/src/__tests__/mastery-persistence.drizzle.test.ts` |
| Transaction/adversarial cases | `packages/domain/src/__tests__/mastery-persistence-transaction.test.ts` |
| Schema/tenant/migration guard | `packages/db/src/__tests__/mastery-persistence-schema.test.ts` |

Do not add persistence code to the four engine packages, React, route handlers, or Server Actions.

## 3. Zod port contracts

Use `z.strictObject`, bounded strings/arrays, finite ranged numbers, ISO datetimes, and closed enums.

| Schema | Required contract |
|---|---|
| `masteryCardRecordSchema` | IDs, school/student/objective/variant, FSRS state, due/review dates, reps/lapses, `paramsVersion`, timestamps |
| `masteryReviewRecordSchema` | immutable review/rating, submission/source IDs, before/after state, evidence reasons, `paramsVersion`, reviewed timestamp |
| `masteryEvidenceRecordSchema` | objective/variant, evidence type, corrected strength, coverage, confidence, attempts, support metadata, source provenance |
| `masteryStateRecordSchema` | objective mastery state, retention, evidence confidence, graph release, monotonic revision |
| `masteryPlacementRecordSchema` | estimate/confidence/type, seed provenance, graph release, replaced-by-direct marker |
| `masteryCalibrationRecordSchema` | population, FSRS weight vector, optimizer/incumbent/candidate versions, gates, human approval, artifact timestamps |
| `masteryCommitRecordSchema` | idempotency key, request/actor/source IDs, contract/graph/params versions, status, result digest, audit timestamps |
| `commitMasteryEvidenceInputSchema` | school/student ownership, validated evidence bundle, expected revisions, audit context, idempotency key |
| `commitMasteryEvidenceResultSchema` | `applied` or `replayed`, stable commit ID/digest, persisted revisions and record IDs |

Reject unknown keys, empty IDs, invalid dates, NaN/Infinity, out-of-range retention/mastery/confidence, oversized evidence, unsupported versions, and actor/student/school mismatches.

## 4. Seven FLAT tables

Create exactly these tables in `packages/db/src/schema/mastery.ts`:

1. `mastery_cards`
2. `mastery_reviews`
3. `mastery_evidence`
4. `mastery_states`
5. `mastery_placements`
6. `mastery_calibrations`
7. `mastery_commits`

Each table has `id`, `schoolId NOT NULL`, audit timestamps, and version/provenance fields appropriate to its record schema. Register all seven as `FLAT` in `tenant-registry.ts` before generating SQL.

Required database constraints:

- card unique: `(schoolId, studentId, objectiveId, variantKey)`;
- review unique: `(schoolId, cardId, submissionId)`;
- evidence unique: `(schoolId, sourceId, evidenceOrdinal)`;
- state unique: `(schoolId, studentId, objectiveId)` with revision check `revision >= 0`;
- placement unique: `(schoolId, studentId, objectiveId, graphRelease, evidenceType)`;
- calibration unique: `(schoolId, domain, ageBand, paramsVersion)`;
- commit unique: `(schoolId, idempotencyKey)` and immutable result digest;
- composite school-scoped foreign keys prevent cross-school references even if IDs are guessed;
- finite/range `CHECK` constraints mirror Zod for mastery, retention, confidence, counters, and revisions.

## 5. Shared adapter conformance suite

`runMasteryPersistenceContract(name, createHarness)` runs unchanged against:

- a fresh `InMemoryMasteryPersistence` harness; and
- an isolated Drizzle test database harness migrated to the current schema.

For both adapters prove:

1. empty reads return empty arrays/null, never fabricated evidence;
2. write/read round-trips preserve every field and version;
3. returned values are defensive copies and ordering is deterministic;
4. all queries and mutations require `schoolId` and cannot observe another school;
5. same idempotency key plus same digest returns the original `replayed` receipt;
6. same key plus different digest is a conflict and mutates nothing;
7. reviews/evidence/commit receipts are append-only;
8. optimistic card/state revisions reject stale writers;
9. provenance and audit actor/request/source metadata round-trip exactly;
10. adapter errors are typed domain errors, not leaked PostgreSQL/provider errors.

No adapter-specific expectation may appear inside the shared suite.

## 6. Atomic orchestration and adversarial matrix

| Case | Required assertion |
|---|---|
| Successful commit | one serializable transaction writes evidence, review, card, state, and commit receipt |
| Duplicate retry | second identical call returns the first result; counts and revisions do not change |
| Concurrent duplicate | two calls race; exactly one applies and both resolve to one stable receipt |
| Concurrent stale state | compare-and-swap permits one revision; loser receives a retryable conflict |
| Cross-school read/write | TenantDB scope returns no foreign rows; conflicting inserted `schoolId` fails closed |
| Missing tenant | every FLAT operation throws before the underlying builder runs |
| Audit omission | missing actor/request/source/version metadata fails Zod before transaction |
| Mid-transaction failure | injected failure after evidence/review rolls back card, state, evidence, review, and commit |
| Provider/model failure | unvalidated/absent evidence calls no adapter method and opens no transaction |
| Empty evidence bundle | deterministic `no_evidence` result; no card/mastery/commit mutation |
| Replay after success | stored result digest and record IDs are returned without recomputation |
| Calibration approval | artifact persists mechanical gates and explicit human approval independently |

Mock-based orchestration tests may extend `createMockDb`, but the shared Drizzle suite is the acceptance gate for real transaction/constraint behavior. Use explicit `tenantDb.unscoped("<owner-FK reason>")` only if a pre-existing REFERENTIAL owner join is unavoidable; the seven new tables themselves must never require it.

## 7. Red-to-Green sequence

1. Add contracts and the shared contract factory; prove both adapter suites fail because implementations/tables do not exist.
2. Add seven table definitions, exports, and seven `FLAT` registrations; run tenant coverage before SQL generation.
3. Generate and review migration SQL for constraints, indexes, foreign keys, and rollback safety.
4. Implement in-memory adapter until the shared suite is green.
5. Implement Drizzle adapter and atomic orchestration until the identical suite and adversarial matrix are green.
6. Run affected package and repository gates; update graph after exports/signatures change.

## 8. Commands

```bash
# Red/shared contracts
TZ=UTC pnpm exec vitest run packages/domain/src/__tests__/mastery-persistence.{in-memory,drizzle}.test.ts packages/domain/src/__tests__/mastery-persistence-transaction.test.ts --maxWorkers=1

# Schema and tenant coverage before generation
TZ=UTC pnpm exec vitest run packages/db/src/__tests__/mastery-persistence-schema.test.ts packages/domain/src/__tests__/tenant-coverage.test.ts --maxWorkers=1

# Generate and inspect migration
pnpm --dir packages/db exec drizzle-kit generate --config drizzle.config.ts
git diff -- packages/db/drizzle packages/db/src/schema/mastery.ts packages/domain/src/tenant-registry.ts
pnpm --filter @reading-advantage/db exec tsx scripts/migration-ledger-doctor.ts

# Package gates
pnpm turbo run check-types lint test build --filter=@reading-advantage/db --filter=@reading-advantage/domain
TZ=UTC pnpm exec vitest run packages/domain/src/__tests__/mastery-persistence*.test.ts packages/db/src/__tests__/mastery-persistence-schema.test.ts --maxWorkers=1

# Repository and architecture gates
pnpm turbo run test
build-graph update ./graph.db packages/domain/src/mastery packages/db/src/schema/mastery.ts packages/domain/src/tenant-registry.ts
build-graph deps ./graph.db MasteryPersistencePort --downstream
python3 measure/doctor.py
```

Phase S3 is not complete until both adapters pass the same contract suite, all seven tables are tenant-covered, the migration is reviewed, and no-evidence/rollback/concurrency tests prove zero partial mutation.
