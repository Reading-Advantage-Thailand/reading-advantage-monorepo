# Phase 2 successor learner-attempt ledger strategy

Track: `sales_mastery_consumer_20260810`
Scope: docs-only successor strategy
Date: 2026-08-18

This strategy defines the owner-approved successor Red/Green path and one
canonical, append-only, graph-bound learner-attempt ledger. It changes no
application, schema, migration, test, or shared-package file.

## Owner approval record

- Owner: Requester, acting as Sales Advantage product owner.
- Approval source: This task instruction.
- Date: 2026-08-18.
- Decision: Approved the successor Red/Green path for the successor contracts
  and one append-only, graph-bound learner-attempt ledger.
- Approved controls: server-derived attempt UUID, server-derived idempotency,
  server-derived submission UUID, trusted writing, transaction-aware Mastery
  creation, and T1/T2 atomicity.
- Approval scope: successor Red preparation, successor Green implementation,
  and the bounded compatibility edits named in section 8.
- Approval boundary: This approval covers the successor Red/Green path, not
  Phase 2 acceptance.
- Supersession boundary: This owner-approved successor strategy supersedes only
  the old Phase 2 execution deferral. It does not supersede Phase 2 acceptance,
  prior review findings, prior acceptance gates, or historical evidence.
- This record does not approve Phase 2 acceptance, release acceptance, roleplay
  admission, or Phase 3 application wiring.

## 1. Graph authority

The accepted Sales graph and binding release are the only evidence authority.

| Authority field      | Required value                                                     |
| -------------------- | ------------------------------------------------------------------ |
| Graph release        | `knowledge-space-sales-mastery-v1.0.0`                             |
| Graph digest         | `5f2b35f7178f0fed9ca103959d59d5e75c0f4818eac355c14a1be270776a9808` |
| Binding digest       | `e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197` |
| Graph source         | `packages/sales-knowledge/src/data/sales-knowledge-space.json`     |
| Binding source       | `packages/sales-knowledge/src/data/sales-curriculum-bindings.json` |
| Objective derivation | The approved coordinate in the binding release                     |
| Practice contract    | `practice.v1`                                                      |

The ledger writer must resolve each quiz question to one exact binding.
The writer must derive `activityId`, `objectiveId`, and `variantId` server-side.
The writer must reject lesson prose, caller objective fields, and caller graph fields.
The writer must store both release digests with every attempt.

The graph binding is immutable for this strategy. A later graph release needs a
new reviewed binding contract and a new migration or ledger version.

## 2. Current quiz and roleplay gaps

### Quiz

Current quiz submission uses these surfaces:

- `packages/domain/src/sales/mutations.ts::submitQuiz`
- `packages/domain/src/sales/schema.ts::quizSubmissionInputSchema`
- `packages/api/src/routers/sales.ts::submitQuiz`
- `apps/sales-advantage/components/quiz-component.tsx`
- `packages/db/src/schema/sales.ts::salesProgress`

The current command grades answers and upserts one lesson progress row.
It stores a score, status, and completion time, but it stores no attempt record.
It returns no server attempt UUID, receipt, or idempotency result.
It does not persist the graph binding or release provenance.
It does not provide replay or conflicting-payload behavior.

The successor writer must derive the score from server-loaded questions.
The successor writer must preserve incorrect evidence for review planning.
The successor writer must not use `salesProgress` as evidence authority.

### Roleplay

Current roleplay submission uses these surfaces:

- `packages/domain/src/sales/mutations.ts::createRoleplayAttempt`
- `packages/domain/src/sales/mutations.ts::saveAttemptEvaluation`
- `packages/domain/src/sales/mutations.ts::submitRoleplayAttempt`
- `packages/db/src/schema/sales.ts::salesRoleplayAttempts`
- `packages/domain/src/sales/roleplay-evaluator.ts`
- `apps/sales-advantage/app/api/roleplay-attempts/route.ts`

The current roleplay table uses `attemptNumber` from a `MAX(...) + 1` query.
The evaluation path updates an existing roleplay row after provider work.
The row is not a graph-bound learner-attempt ledger record.
The current evaluator contract is not the accepted immutable evaluator release.

All eight roleplays remain pending under the accepted Phase 1 decision.
Roleplay cannot write the successor ledger or mutate Mastery in this phase.
The successor must not copy `attemptNumber` into a learner-attempt identity.

## 3. One canonical ledger

The future migration owns one table named `sales_learner_attempt_ledger`.
Existing outbox and receipt tables remain delivery records, not attempt authority.
Existing quiz progress remains a course-progress projection, not attempt authority.
Existing roleplay attempts remain outside this ledger.

### Canonical columns

| Column                      | Rule                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `submission_id uuid`        | Required; one server-derived UUID per quiz submission; no caller value              |
| `attempt_id uuid`           | Primary key; server-derived from `submission_id` and `question_id`; no caller value |
| `outbox_id uuid`            | Required; unique; references the existing Sales outbox                              |
| `application_key text`      | Required; check equals `sales`                                                      |
| `organization_id uuid`      | Required; taken from verified Company Identity                                      |
| `organization_key text`     | Required; taken from verified Company Identity                                      |
| `mastery_tenant_key uuid`   | Required; resolved by the server mapping                                            |
| `source_tenant_key text`    | Required; check equals `sales:<organization_id>`                                    |
| `learner_principal_id text` | Required; taken from the verified local principal                                   |
| `source_application text`   | Required; check equals `sales-advantage`                                            |
| `attempt_kind text`         | Required; check equals `quiz-question` in v1                                        |
| `idempotency_key text`      | Required; server-derived; unique                                                    |
| `lesson_id uuid`            | Required; references the approved Sales lesson                                      |
| `question_id uuid`          | Required; references the Sales quiz question                                        |
| `activity_id text`          | Required; exact graph binding activity identity                                     |
| `objective_id text`         | Required; exact graph binding objective identity                                    |
| `variant_key text`          | Required; exact graph binding variant identity                                      |
| `rubric_version text`       | Required; `sales-rubric.v1` compatibility value for quiz evidence                   |
| `graph_release text`        | Required; exact accepted release value                                              |
| `graph_digest text`         | Required; exact accepted graph digest                                               |
| `bindings_digest text`      | Required; exact accepted binding digest                                             |
| `answer_digest text`        | Required; SHA-256 of the canonical server-validated answer for this question        |
| `payload_digest text`       | Required; SHA-256 of the canonical practice payload                                 |
| `evidence_json jsonb`       | Required; strict server-created practice evidence only                              |
| `request_id text`           | Required; server-generated request identity                                         |
| `correlation_id text`       | Required; server-generated operation identity                                       |
| `occurred_at timestamptz`   | Required; server clock value                                                        |
| `created_at timestamptz`    | Required; database clock value                                                      |

### Canonical constraints

- `submission_id` may occur on many question rows for one quiz submission.
- `attempt_id` has a unique primary key.
- `(submission_id, question_id)` is unique.
- `outbox_id` has a unique foreign key to the existing Sales outbox.
- `idempotency_key` is unique and has a strict server-derived format.
- The composite mapping foreign key binds application, organization, key, and
  Mastery tenant to one `sales_mastery_tenant_mappings` row.
- `mastery_tenant_key` references `schools.id` with `ON DELETE RESTRICT`.
- `lesson_id` references `sales_lessons.id` with `ON DELETE RESTRICT`.
- `question_id` references `sales_quiz_questions.id` with `ON DELETE RESTRICT`.
- `attempt_kind` accepts only `quiz-question` in this release.
- Release, graph digest, binding digest, source application, and application
  checks use exact values.
- Digest fields use strict lowercase SHA-256 formats.
- Score fields in `evidence_json` use domain schema bounds from `practice.v1`.
- `evidence_json` contains no raw audio, provider secret, or caller authority.
- A unique server idempotency key prevents duplicate accepted attempts.
- One quiz submission creates one ledger row per validated question. Each row
  owns exactly one outbox identity, and no outbox identity is shared.
- The table has append-only triggers for `UPDATE`, `DELETE`, and `TRUNCATE`.
- The table has no `attempt_number`, `sequence`, `rank`, or mutable status column.
- Corrections use a new attempt and a new append-only record.

The database must reject cross-organization reuse of an attempt or idempotency
identity. The domain must compare canonical digests before accepting equal replay.

## 3.1 Tenant registry classification

`sales_learner_attempt_ledger` is `REFERENTIAL` in
`packages/domain/src/tenant-registry.ts`.

The table has no `schoolId` column. Its tenant scope comes from the verified
organization mapping, `mastery_tenant_key`, and learner ownership checks.
The domain must access it through
`tenantDb.unscoped("sales learner-attempt ledger uses verified mapping scope")`.
The trusted writer must join the ledger to its mapping and verified principal.
The table must not be classified as `FLAT` or `EXEMPT`.

## 4. Server-derived identity and idempotency

The command accepts only verified identity, lesson ID, answers, and an opaque
client retry key. The retry key is a retry handle, not an authority field.
Question IDs come only from the server-loaded approved questions.

The command rejects caller `attemptId`, `sourceAttemptId`, `idempotencyKey`,
tenant, organization, learner, graph, binding, score, and sequence fields.

The server builds this canonical retry scope:

```text
applicationKey
organizationId
organizationKey
sourceTenantKey
learnerPrincipalId
sourceApplication
lessonId
clientRetryKey
```

The server adds `lessonId` only after it loads the approved lesson under the
verified Sales scope. The lesson is part of the trusted retry scope so one
client retry key cannot replay a submission for another lesson.

After Company Identity verification and mapping resolution, the server derives
one submission UUID from the trusted retry scope:

```text
submissionId = UUID_FROM_DIGEST(
  "sales-quiz-submission.v1:" + canonical(retryScope)
)
```

For each approved question, the server derives one question attempt UUID and
one question idempotency key from the submission ID and question ID:

```text
attemptId = UUID_FROM_DIGEST(
  "sales-quiz-attempt.v1:" + canonical({ submissionId, questionId })
)

idempotencyKey = "sha256:" + HEX_SHA256(
  "sales-quiz-attempt-idempotency.v1:" +
  canonical({ submissionId, questionId })
)
```

`UUID_FROM_DIGEST` is the existing server-side digest-to-UUID method. The
derived UUID is not a sequence value. The server builds each question payload
after it loads the approved questions. It derives each `answerDigest` from the
question ID and its server-validated answer. It derives each `payloadDigest`
from that question's complete graph-bound practice payload.

The server writes `submissionId` and `attemptId` to every ledger row. It writes
`attemptId.toString()` to that row's outbox `sourceAttemptId` field.

Equal retry scope and equal complete payload return the original submission,
question attempts, and receipts or pending states.
Equal retry scope and changed payload fail with `IDEMPOTENCY_CONFLICT` before a
new row is written.
One submission with many questions produces many distinct attempt UUIDs,
idempotency keys, and outbox rows because each key includes `questionId`.
The same retry key under another organization derives a different submission
UUID and different question keys.
No path accepts a caller-created attempt UUID or caller-created attempt sequence.

## 5. Trusted writer and transaction-aware Mastery factory

The only ledger writer is the future domain command in:

`packages/domain/src/sales/mutations.ts::appendSalesQuizAttempt`

The successor retires the prior direct projection command. Phase 2 has no
projection path that accepts a caller payload or a caller source-attempt
identity. Every Mastery projection must begin by loading one persisted ledger
row and its one linked outbox row through the trusted scope.

The writer must:

1. Verify Company Identity through the internal adapter.
2. Resolve the organization mapping from the verified scope.
3. Resolve the learner principal from the verified scope.
4. Load the approved lesson and quiz questions.
5. Resolve each question through the accepted graph binding.
6. Compute score, digests, evidence, one submission UUID, and each question
   attempt UUID and idempotency key on the server.
7. Execute T1 before any Mastery provider call.

The public input schema belongs in:

`packages/domain/src/sales/schema.ts::salesQuizAttemptInputSchema`

The schema must be strict. It must exclude tenant, principal, graph, binding,
score, attempt, idempotency, sequence, and raw evidence overrides.

The trusted factory belongs to the Sales Mastery boundary in:

`packages/domain/src/sales-mastery.ts::SalesPersistenceFactory`

The factory must receive the active transaction handle, mapped tenant, source
tenant key, and verified actor. It must reject construction without that scope.
The factory must not accept a caller-selected tenant or actor.
The Mastery adapter must use the supplied transaction handle.
It must not open an independent root transaction during T2.

### 5.1 Strict output contracts

All public successor outputs use strict `z.object(...).strict()` schemas in
`packages/domain/src/sales/schema.ts`. The writer parses its complete result
before returning it. Unknown keys, invalid UUIDs, invalid timestamps, invalid
digests, and caller-supplied authority fields fail closed.

- `salesQuizSubmissionOutputSchema` contains exactly `submissionId`, `lessonId`,
  `status`, `attempts`, `pending`, and `receipts`. `status` is `pending`,
  `applied`, `replayed`, or `partial`. It is `pending` when every attempt is
  pending. It is `applied` when every attempt has a new receipt. It is
  `replayed` when every attempt returns an existing receipt. It is `partial`
  for every mixed pending, applied, or replayed result.
- `salesQuizQuestionAttemptOutputSchema` contains `submissionId`, `attemptId`,
  `lessonId`, `questionId`, `idempotencyKey`, `answerDigest`, `payloadDigest`,
  and `state`. `state` is `pending`, `applied`, or `replayed`.
- `salesPendingProjectionOutputSchema` contains `submissionId`, `attemptId`,
  `lessonId`, `questionId`, `outboxId`, `state: "pending"`, and
  `retryable: true`.
- `salesProjectionReceiptOutputSchema` contains `receiptId`, `outboxId`,
  `submissionId`, `attemptId`, `lessonId`, `questionId`, `organizationId`,
  `masteryTenantKey`, `learnerPrincipalId`, `idempotencyKey`, `status`,
  `requestId`, `correlationId`, `occurredAt`, and `createdAt`. `status` is
  `applied` or `replayed`.

Each validated question appears in exactly one pending state or receipt state.
No successor output represents roleplay evidence.

## 6. T1 and T2 transaction boundaries

### T1: outbox plus ledger

T1 runs in one database transaction.

1. Resolve the trusted scope and graph binding before the transaction.
2. Insert one outbox row for each question attempt with server-derived
   identity and payload.
3. Insert one ledger row for each question, linked to its own outbox row.
4. Commit every ledger/outbox pair together.
5. Return the server submission identity, question attempt identities, and
   pending delivery states.

If either insert fails, no row or outbox pair remains. Equal replay returns the
existing rows after digest comparison. Conflicting replay writes no row.

T1 does not call Mastery. T1 does not insert a receipt.

### T2: Mastery plus receipt

T2 runs in one database transaction for one pending outbox and ledger pair.

1. Select exactly one graph-bound ledger row and its exactly one linked outbox
   row by server identity. Reject the projection if either row is missing,
   duplicated, or mismatched.
2. Recheck organization, learner, tenant, release, binding, and digest fields.
3. Create Mastery with the active transaction-aware factory.
4. Commit `practice.v1` evidence through the scoped Mastery port using the
   active transaction handle.
5. Insert one receipt bound to the outbox, attempt, tenant, learner, and key.
6. Commit Mastery rows and the receipt together.

If Mastery or receipt insertion fails, T2 rolls back. The T1 outbox remains
pending because no receipt exists. A retry runs T2 again without a new ledger
or outbox row. A submission with multiple questions can run one T2 boundary
per pending pair.

The receipt is the delivery proof. The ledger is the learner-attempt proof.
Neither record supports update, delete, truncate, or in-place correction.

## 7. Roleplay is rejected in Phase 2

The successor writer rejects `roleplay` and `roleplay-evaluation` with the stable
`ROLEPLAY_NOT_ADMITTED_PHASE2` error before any ledger, outbox, Mastery, provider,
or storage access.
The ledger check permits only `quiz-question` in version one.

Roleplay needs all of these before a later admission:

- owner-approved evaluator release;
- immutable evaluator input and attempt digest;
- approved rubric and evaluator provenance;
- consent and retention validation before provider or storage access;
- separate Red contracts for eligibility, replay, and privacy.

The successor does not change roleplay routes, roleplay evaluation, audio, or
roleplay progress. The current `attemptNumber` remains outside this ledger.

## 8. Exact successor Red files and compatibility edits

The successor Red checkpoint must add exactly two new test files: one domain
ledger Red and one live PostgreSQL 16 Red.

- `packages/domain/src/__tests__/sales-successor-learner-attempt-ledger.red.test.ts`
- `packages/db/src/__tests__/sales-successor-learner-attempt-ledger-pg16.red.test.ts`

The domain Red must prove trusted inputs, graph binding, one submission UUID,
question-specific attempt and idempotency derivation, many rows without key
collision, equal replay, conflicting replay, cross-organization denial, strict
submission/attempt/pending/receipt output schemas, roleplay rejection, and T1/T2
seams.

The PostgreSQL 16 Red must prove UUID persistence, foreign keys, unique keys,
submission-to-question uniqueness, one outbox per attempt, append-only
triggers, T1 rollback, T2 rollback, and pending retry behavior.

The successor Red/Green path may edit exactly these existing compatibility test
files:

- `packages/domain/src/__tests__/sales-mastery-projection.red.test.ts`
- `packages/domain/src/__tests__/sales-phase2-review-a.red.test.ts`
- `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts`
- `packages/db/src/__tests__/sales-phase2-transaction-atomicity.red.test.ts`

These edits must update expectations for legacy projection-mode removal and for
the active transaction handle used by Green. They must not add another new Red
file. Preserve prior commits and evidence as history. Make these edits in new
successor commits. Do not amend or rewrite old commits.

No existing Red file outside the compatibility list may change in this
successor path. The prior Red commits and evidence remain historical evidence;
their old contents remain available in Git history:

- `packages/domain/src/__tests__/sales-phase2-review-a.red.test.ts`
- `packages/domain/src/__tests__/sales-phase2-trusted-only.red.test.ts`
- `packages/domain/src/__tests__/sales-phase2-mode-isolation.red.test.ts`
- `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts`
- `packages/db/src/__tests__/sales-phase2-transaction-atomicity.red.test.ts`

The successor Red checkpoint must fail on the current missing successor behavior.
It must contain no empty test, skip-only pass, or source change.

## 9. Exact future Green files

Green production and migration work may change only these implementation and
migration files:

- `packages/domain/src/sales/schema.ts`
- `packages/domain/src/sales/mutations.ts`
- `packages/domain/src/sales-mastery.ts`
- `packages/db/src/schema/sales-mastery.ts`
- `packages/domain/src/tenant-registry.ts`
- `packages/db/drizzle/0054_sales_learner_attempt_ledger.sql`
- `packages/db/drizzle/meta/0054_snapshot.json`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/sentinels.ts`

The successor path may also change only the four compatibility test files named
in section 8. It may add only the two new Red files named in section 8.

`packages/domain/src/mastery/drizzle-mastery-persistence.ts` is conditionally
allowed in Green only if the live PostgreSQL 16 Red proves that the current
adapter cannot use the active transaction handle required by T2. The live Red
must prove this need because artifact tests cannot prove transaction joining.
If the live Red passes without an adapter change, this file remains excluded.

Green must remove the legacy projection mode from
`packages/domain/src/sales-mastery.ts`. It must preserve prior commits and
historical evidence files. It must not rewrite prior migrations or receipts.

Green must not add a direct projection path. It must reject roleplay in Phase 2.

No application route, tRPC router, React component, roleplay route, or shared
engine file belongs in the Green set.

## 10. PostgreSQL 16 gates

The live Red command must use a disposable PostgreSQL 16 database.
The harness must verify the server major version before each live test.
The harness must clean the database after each test.

```bash
CI=true pnpm --filter @reading-advantage/domain exec vitest run \
  src/__tests__/sales-successor-learner-attempt-ledger.red.test.ts --maxWorkers=1
```

```bash
PG_TEST_URL="$PG_TEST_URL" \
REQUIRE_SALES_SUCCESSOR_LEDGER_LIVE=true \
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/sales-successor-learner-attempt-ledger-pg16.red.test.ts --maxWorkers=1
```

At the Red checkpoint, both files must exercise their assertions. At Green,
both commands must exit zero with no live-test skip.

Green must also run the focused domain, Sales Knowledge, migration, schema,
tenant-coverage, type, lint, format, and diff checks for changed packages.
The aggregate repository test and lint commands remain outside this gate.

## 11. Immutable shared-package diff guard

After Green, this command must return no output:

```bash
git diff --name-only "$successor_phase2_base_sha" HEAD -- \
  packages/knowledge-space-core \
  packages/knowledge-space-practice \
  packages/practice-core \
  packages/srs-engine \
  packages/sales-knowledge \
  packages/mastery-runtime-compat
```

The guard protects the accepted graph, shared runtime, practice contract, and
SRS engine. Any output blocks Green review.

## 12. Successor phase-base capture

Do not capture `successor_phase2_base_sha` in this docs-only worktree change.
Restore the two-commit base protocol:

1. Commit the strategy and changed plan block together as the strategy-plus-plan
   commit. Do not include Red files, source, migrations, APK paths, or unrelated
   dirty paths.
2. Create the successor evidence in a separate evidence/plan-marker commit.
3. Change the docs task marker to `[x]` in that commit.
4. Do not add successor Red or Green work to that commit.
5. After both commits, confirm one master worktree.
6. Confirm that no track-owned path is dirty.
7. Preserve unrelated dirty paths.
8. Do not stage unrelated dirty paths.
9. Run `git rev-parse HEAD` after the evidence/plan-marker commit.
10. Attach a Git note to that commit. Record its exact SHA as
    `successor_phase2_base_sha` in the note. The note does not change the commit.

The Git note value must identify the state after both docs commits. It is the
baseline for successor Red and Green diff guards. Do not reuse
`phase2_base_sha`, `fd581f3dcd15e7b7b632875862aaecb596719621`, or an older role
base. No successor Red or Green file may precede this capture.

## 13. Review applicability

| Review             | Applicability | Required focus                                                                   |
| ------------------ | ------------- | -------------------------------------------------------------------------------- |
| Security           | Yes           | Company Identity, tenant scope, replay, raw input, and append-only controls      |
| Adversarial        | Yes           | Caller overrides, cross-organization reuse, digest drift, and transaction faults |
| Database           | Yes           | PostgreSQL 16 constraints, triggers, migration chain, and rollback               |
| Architecture       | Yes           | Trusted writer, adapter boundary, graph authority, and shared-package guard      |
| API and UX         | Partial       | Contract shape only; no route or UI wiring                                       |
| Browser            | No            | Browser behavior belongs to Phase 4                                              |
| Roleplay evaluator | No            | Phase 2 rejects roleplay; later admission needs a separate accepted strategy     |

## 14. Anti-pattern defenses

| Defense                       | Successor control                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| A2 consent-blind publish gate | Phase 2 rejects roleplay before ledger, provider, or storage access; later admission needs consent |
| A3 digit-only count           | Live tests parse labeled SQL counts, not bare digits                                               |
| A4 vacuous pass               | Red tests require substantive missing behavior and non-empty persisted rows at Green               |
| A5 false claim                | This file makes no test-pass or acceptance claim                                                   |
| A6 registry overstatement     | The strategy supersedes only execution deferral and records neither Green nor acceptance           |
| A7 broad filter               | Gates name exact package and test paths                                                            |
| A8 marker ambiguity           | Later plan updates use only `[~]`, `[x]`, and `[b]` markers                                        |
| A10 generated-facts drift     | Green updates `build-graph` after structural source edits                                          |
| A11 blocked execution truth   | The Red checkpoint records execution; later plan status must match evidence                        |
| A14 detector syntax           | Any future detector uses `rg -n`, not `rg -nE`                                                     |
| A15 stale receipt hashes      | Later role fixes require a new receipt with current hashes                                         |
| A16 worktree divergence       | Phase-base capture requires one master worktree                                                    |

## 15. Non-goals

- No Phase 3 application call-site wiring.
- No changes to `apps/sales-advantage` routes, components, or tRPC adapters.
- No roleplay ledger admission or roleplay Mastery mutation.
- No replacement of the approved graph or curriculum release.
- No shared KST/SRS engine, practice engine, or runtime-compat change.
- No new attempt sequence or migration of legacy `attemptNumber` values.
- No CRM, customer, licensing, billing, revenue, or commission behavior.
- No destructive rewrite of prior migrations, rows, receipts, or evidence.
- No APK work or APK path inspection.

## 16. Status boundary

This file records owner-approved successor design and Red scope only.
It does not claim successor Red completion, Green completion, Phase 2 acceptance,
production readiness, or release acceptance.
