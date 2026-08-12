# Finance Operations Phase 2 test strategy - controlled operational imports

> Canonical, falsifiable test strategy for Phase 2 of
> `company_finance_operations_20260810`. Owned by the Measure Strategy
> subagent. The orchestrator, Mid-red, Jr-green, phase-acceptance,
> final-acceptance, and adversarial-testing roles consume this document. It is
> the single source of truth for what Red, Green, and closeout mean for Phase 2.

## Scope and revision

- **Track:** `company_finance_operations_20260810`
- **Phase:** Phase 2 - controlled operational imports
- **Tasks in scope:**
  - Task 1 (admitted `[~]`): "Implement idempotent historical private-evidence
    packets, payroll-summary imports, historical school-billing snapshots,
    evidence references, and correction/supersession flow."
  - Task 2 (remains `[b]`): "Pilot one reconciled historical month and one
    historical billing packet with authorization, audit, rollback, and
    duplicate/conflict evidence through owner-attested private-evidence packets
    only." Blocked until Task 1 implementation evidence permits it.
- **role_base_sha / current HEAD:** `13565ae7ba2d18ed21016ee71a80ff3629411f62`
- **Phase 1 accepted baselines (dependencies now satisfied):**
  - Task 1 foundation: `3b3a128ea381f8fff0c6e1136894fd39228eaff9`
  - Task 2 persistence: `c5ecf18b0830c8702602f9f5f33415c7b3e92d66`
  - Task 3 boundaries: `48470311d4f6b06b7e9ebcce7ba1f380444f0a79`
    (maintenance `da3ce21916a170ea9029efe1c449ea39395a36ba`)
- **Strategy lease:** owns only
  `measure/tracks/company_finance_operations_20260810/test-strategy-phase2.md`,
  Phase 2 annotations in `plan.md`, and the role log at
  `measure/tracks/company_finance_operations_20260810/orchestration/phase2-strategy-role.log`.
  No production, test, spec, decision, metadata, registry, DB, storage, or
  lockfile edits.

## Reconciliation: why `deferred:phase2` is lifted for Task 1

Both Phase 2 tasks were marked `[b] deferred:phase2` when the plan was written.
The marker conflated two separate concerns:

1. **Dependency on Phase 1 boundaries (now satisfied).** Task 1 states:
   "Depends on the accepted Company Identity, private-read, and durable-outbox
   boundaries above." Phase 1 Task 3 accepted all three boundaries in commit
   `48470311` with maintenance `da3ce219`. The accepted evidence is:
   - Company Identity Finance attestor: 7 tests green
     (`finance-authorization-adapter.red.test.ts`)
   - Private-evidence reader: 25 tests green
     (`finance-private-evidence-read.red.test.ts`)
   - Durable outbox projector: 10 tests green
     (`durable-job-adapter.red.test.ts`)
   - Integrating packet contract: 63 tests green
     (`historical-private-evidence-packet.red.test.ts`)
   - Protocol safety: 13 tests green
     (`protocol-safety.red.test.ts`)

2. **CRM/Tutor source-owner blocker (does not apply to Phase 2).** The spec
   states: "Phase 2 must use only the historical private-evidence packet and
   must reject Finance-owned CRM or Tutor lookalike envelopes." The MVP decision
   states: "The Phase 2 Red contract must use executable behavior-level tests
   and injected fakes at the actual Company Identity, storage, and durable-job
   boundaries. It must cover historical private-evidence packets and pilot
   behavior only. It must not require live CRM or Tutor adapters or envelopes."
   The CRM/Tutor source-owner task is a separate `[b]` task in Phase 1. It does
   not gate Phase 2.

**Determination: Phase 2 Task 1 is executable using only
`historical-private-evidence-packet.v1`.** No live CRM/Tutor adapters, no
guessed Thai policy, no source lookalike envelopes, and no cross-database
credentials are required. The Red test already exists
(`controlled-imports-phase2.red.test.ts`) and is genuinely red: 20 behavior
tests fail because the six required functions do not exist; 4 guard tests pass
because they test the AST walker or assert the module is still deferred.

**No real external blocker exists for Task 1.** The pilot task (Task 2) remains
`[b]` because it requires Task 1 implementation evidence (the six functions must
exist and pass) before a reconciled historical month and billing packet can be
piloted.

## phase_base_sha capture point (authoritative)

Immediately after the commit that introduces this `test-strategy-phase2.md`
(together with only the leased `plan.md` annotation), the orchestrator MUST
capture the immutable `phase_base_sha` for Phase 2 by running:

```bash
git rev-parse HEAD
```

That post-strategy-commit SHA is the only valid Phase 2 `phase_base_sha`. No
earlier SHA may be used: `13565ae7` (current HEAD / role_base_sha),
`48470311` (Task 3 source), and `da3ce219` (maintenance) all predate the
committed strategy and must not be embedded as the Phase 2 base. The Red-stage
tests for Phase 2 are admitted on top of the strategy commit; Jr-green then
implements against the same base. If the strategy is later refreshed, a new
`phase_base_sha` is captured at the refresh commit and the prior one is retired.

## Accepted evidence vs candidate work (do not conflate)

Only these are accepted evidence for Phase 1 prior to Phase 2:

- `phase1-foundation-acceptance-20260810.md` (Task 1)
- `phase1-persistence-acceptance-20260811.md` (Task 2)
- Task 3 acceptance evidence recorded in `plan.md` (commit `48470311`,
  maintenance `da3ce219`)
- All committed contracts/tests/production at and before `13565ae7`

The working tree contains unrelated dirty paths (codecamp-advantage playwright
reports, pnpm-lock.yaml, opencode goals). None of these are Phase 2 evidence.
The acceptance role must evaluate Phase 2 candidate work against this strategy,
not treat any uncommitted diff as proven.

## Existing Red contract

The Phase 2 Red contract already exists as
`packages/backend/src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts`.
It defines a `ControlledImportsModule` interface with six required exports from
the finance-operations barrel (`../index.js`):

1. `prepareControlledImportBatch(input): PreparedControlledImportBatch`
2. `classifyControlledImportBatchReplay(input): ControlledImportReplayResult`
3. `prepareControlledImportCorrection(input): FinanceRecord`
4. `createControlledImportJobIdentity(input): string`
5. `acceptControlledImportBatch(request): Promise<ControlledImportAtomicResult>`
6. `runHistoricalPrivateEvidencePilot(input): Promise<{status, packetVersion, liveSourceAdaptersUsed}>`

Current Red state (verified 2026-08-13 against `13565ae7`): 20 tests fail
because the functions are `undefined`; 4 tests pass because they test the AST
walker fixtures or assert `controlled-imports.ts` does not exist. This is the
correct Red state for Phase 2 Task 1.

**Mid-red changed-contract risk:** the test currently asserts
`existsSync(CONTROLLED_IMPORTS_PATH)` is `false` in two guard tests ("keeps
deferred CRM and Tutor adapters..." and "keeps controlled-import production code
behind compiler-checked internal boundaries"). When Jr-green creates
`controlled-imports.ts`, those two assertions must be updated by the Mid-red
role to read the real source and check it for lookalikes and boundary
violations, instead of asserting non-existence. The Mid-red role must not
remove the lookalike or boundary checks; it must activate them against the real
source.

## Boundary decomposition

Phase 2 Task 1 decomposes into six behavior boundaries plus a source-isolation
guard and a closeout gate. Each is a section below with its own Red command,
Green gate, risk class, and anti-pattern coverage.

- **2.A** - Normalization boundary (`prepareControlledImportBatch`): versioned
  accepted source envelopes, policy-neutral snapshot/record preparation, data
  minimization, variant ambiguity, exact decimal-to-minor-unit conversion.
- **2.B** - Replay/conflict classification (`classifyControlledImportBatchReplay`):
  collision-free identity, replay vs conflict with exact reasons.
- **2.C** - Correction/supersession (`prepareControlledImportCorrection`):
  immutable correction without mutating accepted state.
- **2.D** - Durable job identity (`createControlledImportJobIdentity`):
  collision-free length-prefixed encoding.
- **2.E** - Atomic batch acceptance (`acceptControlledImportBatch`):
  authorization, scope matching, atomic record+job+audit, rollback, concurrent
  resolution.
- **2.F** - Historical pilot contract (`runHistoricalPrivateEvidencePilot`):
  packet.v1 only, no live source adapters.
- **2.G** - Source-isolation and deferred-source-owner guards (AST boundary +
  CRM/Tutor lookalike rejection).
- **2.H** - Closeout gate.

---

## Phase 2.A - Normalization boundary

**Risk:** `critical` (the data-minimization grammar is the only barrier between
raw private documents and normalized Finance facts; a guessed Thai policy field
or a leaked sensitive identifier here contaminates the whole subledger).

**Targeted Red command (must fail before green):**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "requires versioned provider-neutral acceptance envelopes before normalization"
```

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "prepares PA-INV-2026-001 exactly"
```

Expected red failure: `subject.prepareControlledImportBatch` is `undefined`, so
`requireFunction` throws `expected undefined to be type of 'function'`.

**Green gate (must pass after implementation):**

- The Red commands above exit 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.
- `pnpm --filter @reading-advantage/backend exec eslint src/modules/finance-operations`
  exits 0.

**Closeout gate (2.A):**
- `prepareControlledImportBatch` accepts only versioned
  `AcceptedControlledSourceEnvelope` inputs with
  `envelopeVersion: "finance-controlled-source-envelope-v1"` and a
  `private-evidence-storage` source-acceptance port receipt. It rejects direct
  unaccepted source documents, unknown envelope versions, and CRM/Tutor
  lookalike envelopes (`crm-customer-billing-catalog`,
  `tutor-financial-export` ports).
- It produces a `ready` or `unresolved` batch. A `ready` batch contains deeply
  frozen snapshots and records with exact minor-unit amounts, source-stated
  labels only, and no forbidden keys. An `unresolved` batch carries variant
  snapshots without records when `ambiguityGroupId` collides.
- It rejects: floating-point amounts; forbidden policy/PII keys (`vatRate`,
  `taxAmount`, `accountCode`, `ledgerAccount`, `deductible`, `name`, `email`,
  `bankAccount`, `accountNumber`, `taxId`, `rawPayload`); unsafe text
  (`<script>`, newlines, NUL bytes, JSON, emails, oversize strings); malformed
  digests; cross-company evidence references; receipt digest mismatches;
  envelope scope mismatches; source version/record mismatches.
- `thaiTaxDocumentStatus` may be only `"not-source-asserted" | "unresolved"`;
  `"tax-invoice"` is forbidden. Source-stated WHT/GST/dates are preserved as
  text labels, never interpreted.
- The output is deeply frozen and does not alias the input.

**Fixtures and mocks:** plain-object `ControlledSourceDocumentInput` fixtures
wrapped in `AcceptedControlledSourceEnvelope` via `privateEvidenceEnvelope()`.
No database, no storage driver, no real Company Identity call. The
normalization boundary is a pure function over already-accepted envelopes.

**Live-behavior proof expectation:** none at this boundary. 2.A is a pure
normalization contract over accepted envelopes. The live private-evidence read
is owned by the accepted Phase 1 Task 3 reader boundary.

**Architecture guardrails / changed-contract risks:**
- The normalization function must live in `controlled-imports.ts` inside the
  finance-operations module. It must not import a provider SDK, `drizzle-orm`,
  `postgres`, `@reading-advantage/db`, `firebase-admin`, `googleapis`, or
  `@aws-sdk/`. The AST boundary walker (`collectControlledImportBoundaryViolations`)
  enforces this.
- The `private-evidence://` grammar is owned by the storage package (Phase 1
  Task 3). The normalization boundary re-uses the same
  `privateEvidenceReferenceSchema`; a grammar drift is a changed-contract risk.
- The forbidden-key allowlist is a new Finance contract. Adding a key is a
  policy decision and must be reviewed. The `controlled-imports-phase2` test
  enumerates every forbidden key; the Green implementation must agree.
- `amountDecimal` (string) to `amountMinor` (string) conversion must use exact
  decimal arithmetic, never binary floating-point. A `Number()` conversion is a
  correctness bug and a falsifier.

**Anti-pattern coverage:**
- **A1 / A4** - The test asserts exact `amountMinor` values
  (`"14700000"`, `"7350000"`, etc.), exact key sets via
  `Object.keys(result).sort()`, and `expectDeepFrozen(result)`. Falsifier: a
  floating-point conversion, a forbidden key in the output, or a mutable return
  fails the test.
- **A3** - The `student-count` fact asserts `count: "147"` as a labeled string,
  not a digit-only regex. Falsifier: returning a number or an unlabeled digit
  fails.
- **A5 / A6** - No "policy-neutral" or "normalization green" claim unless the
  forbidden-key and `thaiTaxDocumentStatus` rejection tests pass.
- **A7** - The forbidden-key allowlist is an explicit `Set` in
  `collectForbiddenKeys`, not a bare-word filter. The deferred-source-owner
  markers are an explicit `as const` array. Each forbidden key and each marker
  is a discrete falsifier.

**Review applicability:** security review **required** (data minimization, PII
rejection, policy-neutrality); adversarial testing **required** (the
forbidden-key matrix, unsafe-text matrix, cross-company/digest/scope mismatch
matrix, lookalike-envelope rejection); UX/API review **not applicable**;
browser review **not applicable**.

---

## Phase 2.B - Replay/conflict classification

**Risk:** `high` (a misclassified replay hides a conflict; a misclassified
conflict rejects a safe retry).

**Targeted Red command:**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "classifies replay across company"
```

Expected red failure: `subject.classifyControlledImportBatchReplay` is
`undefined`.

**Green gate:**
- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.

**Closeout gate (2.B):**
- `classifyControlledImportBatchReplay` returns `replay` when scope, source
  system, source version, import batch ID, and batch digest all match.
- It returns `conflict` with an exact reason (`scope-mismatch`,
  `source-system-mismatch`, `source-version-mismatch`,
  `import-batch-id-mismatch`, `payload-digest-mismatch`) for each mismatched
  field.
- The returned `acceptedRecordIds` array is a copy, not an alias of the
  existing array.
- The result is deeply frozen. The existing input is not mutated.

**Fixtures and mocks:** plain-object `AcceptedControlledImportBatch` fixtures.
No database.

**Live-behavior proof expectation:** none. 2.B is a pure classification
function.

**Architecture guardrails / changed-contract risks:**
- The classification identity fields (scope, source system, source version,
  import batch ID, batch digest) are a new Finance contract. Changing the
  field set after any batch is accepted breaks replay recognition.
- The conflict reason enum is a new contract. Adding a reason is a
  changed-contract risk that ripples into audit and operator tooling.

**Anti-pattern coverage:**
- **A1 / A4** - The test asserts `result.acceptedRecordIds` is `not.toBe`
  `existing.acceptedRecordIds` (no aliasing) and `expectDeepFrozen(result)`.
  Falsifier: returning the same array reference or a mutable object fails.
- **A3** - The six mismatch cases are enumerated with exact reason strings, not
  a digit-only count. Falsifier: a wrong reason or a missing case fails.

**Review applicability:** security review **required** (replay integrity,
conflict classification); adversarial testing **required** (the six mismatch
cases); UX/API review **not applicable**; browser review **not applicable**.

---

## Phase 2.C - Correction/supersession

**Risk:** `medium` (corrections must not mutate accepted state; a mutation
breaks the append-only history).

**Targeted Red command:**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "prepares a deeply frozen correction"
```

Expected red failure: `subject.prepareControlledImportCorrection` is
`undefined`.

**Green gate:**
- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.

**Closeout gate (2.C):**
- `prepareControlledImportCorrection` returns a `FinanceRecord` with
  `supersedesRecordId` and `correctionReason` set, the provided `money` and
  `provenance` copied (not aliased), and the accepted record's scope retained.
- The correction is deeply frozen. The accepted record is not mutated. The
  input `money` and `provenance` objects are not aliased (mutating them after
  the call does not change the correction).

**Fixtures and mocks:** `readyPlan().records[0]` as the accepted record;
plain-object `money` and `provenance` overrides.

**Live-behavior proof expectation:** none. 2.C is a pure record-construction
function.

**Architecture guardrails / changed-contract risks:**
- The correction record must satisfy the existing `financeRecordSchema` from
  Phase 1 (which requires both `supersedesRecordId` and `correctionReason` or
  neither). A correction that omits one is a contract violation.
- The correction must not carry a `scope` that differs from the accepted
  record's scope. A scope change is a changed-contract risk.

**Anti-pattern coverage:**
- **A1 / A4** - The test mutates `money.amountMinor` and
  `provenance.payloadDigest` after the call and asserts the correction is
  unchanged. Falsifier: aliasing the input objects fails this assertion.
- **A5** - No "correction green" claim unless the no-mutation test passes.

**Review applicability:** security review **required** (append-only integrity);
adversarial testing **required** (the aliasing and mutation falsifier); UX/API
review **not applicable**; browser review **not applicable**.

---

## Phase 2.D - Durable job identity

**Risk:** `medium` (a collision in job identity double-processes a batch; a
non-collision-free encoding silently merges distinct batches).

**Targeted Red command:**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "creates collision-free structured durable-job identities"
```

Expected red failure: `subject.createControlledImportJobIdentity` is
`undefined`.

**Green gate:**
- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.

**Closeout gate (2.D):**
- `createControlledImportJobIdentity` returns a length-prefixed
  (`len:value`) structured identity over `DURABLE_JOB_VERSION`, company,
  optional school, and batch ID.
- Five crafted inputs that would collide under naive concatenation (including
  delimiter-bearing values like `"school:batch|one"`) produce five distinct
  identities.
- The identity matches `expectedJobIdentity()` exactly.

**Fixtures and mocks:** plain-object scope and batch-ID fixtures.

**Live-behavior proof expectation:** none. 2.D is a pure encoding function.

**Architecture guardrails / changed-contract risks:**
- The encoding format (`len:value` length-prefixing) is a new Finance contract.
  Changing the format after any job is enqueued breaks idempotency recognition.
- The `DURABLE_JOB_VERSION` constant (`"finance-controlled-import-job-v1"`) is
  load-bearing. Changing it without a migration is a changed-contract risk.

**Anti-pattern coverage:**
- **A3** - The collision-freedom assertion uses crafted delimiter-bearing inputs
  and asserts `new Set(identities).size === inputs.length`. This is a labeled,
  structural identity check, not a digit-only count. Falsifier: a naive
  concatenation key produces a collision and the set size is less than 5.
- **A1 / A4** - The test asserts exact identity strings via
  `expectedJobIdentity()`. Falsifier: a wrong encoding or a missing field
  fails.

**Review applicability:** security review **required** (idempotency integrity);
adversarial testing **required** (the collision-freedom matrix); UX/API review
**not applicable**; browser review **not applicable**.

---

## Phase 2.E - Atomic batch acceptance

**Risk:** `critical` (the atomic record+job+audit boundary; a partial commit
double-charges or loses an audit trail; a concurrent race produces two accepted
batches for the same identity).

**Targeted Red command:**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "fails closed on an authorization denial"
```

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "atomically resolves concurrent"
```

Expected red failure: `subject.acceptControlledImportBatch` is `undefined`.

**Green gate:**
- The Red commands above exit 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.
- `pnpm --filter @reading-advantage/backend exec eslint src/modules/finance-operations`
  exits 0.

**Closeout gate (2.E):**
- `acceptControlledImportBatch` calls the injected
  `CompanyIdentityAuthorizationPort` first. On `deny`, it rejects with
  `reason: "authorization-denied"`, appends a `denied` audit event, and does
  not call the repository.
- On `allow`, it checks the authorization scope against the plan scope. A
  company or school mismatch rejects with `reason: "scope-mismatch"`, appends a
  `failed` audit event, and does not call the repository.
- On a matching scope, it calls `repository.applyBatchAtomically` with the plan,
  a `ControlledImportDurableJobIntent` (versioned, with the collision-free
  idempotency key and the plan's batch digest), and a `succeeded` audit event.
- It returns `accepted`, `replay`, or `conflict` from the repository, deeply
  frozen and not aliased to the repository's return value.
- The plan, durable job, and audit event passed to the repository are not
  aliased to the caller's objects (the test mutates the input after the call
  and checks the repository received a copy).
- On repository staging failure (`record`, `job`, or `audit` stage), the
  repository fake rolls back all staged state; the command rejects with the
  staging error and appends both an `allowed` and a `failed` audit event.
- Under concurrent identical commands, one resolves as `accepted` and the other
  as `replay`; only one record set and one job are persisted.
- Under concurrent changed payloads, one resolves as `accepted` and the other
  as `conflict` with `payload-digest-mismatch`; the accepted state is not
  replaced.

**Fixtures and mocks:** injected `CompanyIdentityAuthorizationPort` (allow or
deny), injected `FinanceAuditPort` (records events), injected
`ControlledImportAtomicRepository` fake (`createAtomicRepositoryFake` with
staging, failpoints, a promise barrier for concurrency, and accepted-state
tracking). No real database.

**Live-behavior proof expectation:** none at this boundary for Task 1. The
atomic repository is an injected port. A live-PostgreSQL proof of the concrete
`applyBatchAtomically` adapter is a closeout follow-up, not a Task 1 Green gate.
If added, it must use a disposable least-privilege database (same rules as
Phase 1 Task 2: randomly-named test database, never `reading_advantage`,
`primary_advantage`, or `science_advantage`; cleanup verification must find 0
remaining temporary databases and 0 remaining temporary roles).

**Architecture guardrails / changed-contract risks:**
- `acceptControlledImportBatch` must not open a database connection. It consumes
  the injected repository. The concrete PostgreSQL adapter is a separate
  concern.
- The durable job intent must use `createControlledImportJobIdentity` for its
  idempotency key. A divergent key encoding between 2.D and 2.E is a
  changed-contract risk.
- The audit event shape (`eventId`, `actorSubjectId`, `operation`,
  `objectType`, `objectId`, `occurredAt`, `requestId`, `correlationId`,
  `scope`, `outcome`) must match the accepted `financeAuditEventSchema` from
  Phase 1. A field change is a changed-contract risk.
- The `expectedAuditEventId` encoding (`len:value` over requestId, operation,
  company, school, batch, outcome) is a new Finance contract. Changing it
  breaks audit-trail correlation.

**Anti-pattern coverage:**
- **A1 / A4** - The test asserts `repository.applyBatchAtomically` was called
  with exact `durableJob` and `audit` objects, and `not.toHaveBeenCalled()` on
  denial and scope-mismatch paths. Falsifier: calling the repository before
  authorization, or skipping the denial audit, fails.
- **A3** - The concurrent test asserts `results.map(r => r.status).sort()`
  equals `["accepted", "replay"]` and `atomic.records.length === 1`. These are
  labeled structural assertions, not digit-only counts.
- **A5** - No "atomic acceptance green" claim unless the concurrent and rollback
  tests pass.
- **A15** - If a role receipt is produced for the green commit, it must bind
  the Phase 2 `phase_base_sha` and the green commit, not a stale Phase 1 hash.

**Review applicability:** security review **required** (authorization root,
scope matching, atomic integrity, rollback, concurrent safety); adversarial
testing **required** (denial, scope-mismatch, staging-failure rollback,
concurrent accepted+replay, concurrent accepted+conflict); UX/API review **not
applicable**; browser review **not applicable**.

---

## Phase 2.F - Historical pilot contract

**Risk:** `medium` (the pilot contract must prove no live source adapters are
used; a leak contradicts the spec's "no live CRM or Tutor" boundary).

**Targeted Red command:**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "requires controlled-import and historical-private-evidence pilot behavior"
```

Expected red failure: `subject.runHistoricalPrivateEvidencePilot` is
`undefined`.

**Green gate:**
- The Red command above exits 0.
- `pnpm --filter @reading-advantage/backend run check-types` exits 0.

**Closeout gate (2.F):**
- `runHistoricalPrivateEvidencePilot` accepts a
  `{packetVersion: "historical-private-evidence-packet.v1", sourceSystem}`
  input and returns `{status: "accepted" | "replay" | "conflict",
  packetVersion: "historical-private-evidence-packet.v1",
  liveSourceAdaptersUsed: []}`.
- The empty `liveSourceAdaptersUsed` array is the executable proof that no live
  CRM or Tutor adapter is used. This is the spec's "must not use live CRM or
  Tutor adapters" boundary made testable.

**Fixtures and mocks:** plain-object pilot input. No live adapters.

**Live-behavior proof expectation:** none. 2.F is a contract-level pilot proof.
The full reconciled-month pilot belongs to Task 2 (blocked).

**Architecture guardrails / changed-contract risks:**
- `runHistoricalPrivateEvidencePilot` must not import or call a CRM or Tutor
  port. The deferred-source-owner marker guard
  (`collectDeferredSourceOwnerLookalikes`) enforces this at the AST level.
- The `liveSourceAdaptersUsed: readonly []` return type is a compile-time
  constraint. Widening it to allow non-empty arrays is a changed-contract risk
  that violates the spec.

**Anti-pattern coverage:**
- **A1 / A4** - The test asserts `liveSourceAdaptersUsed` is `[]` via
  `toMatchObject`. Falsifier: returning a non-empty array or a live adapter
  name fails.
- **A5 / A6** - No "pilot green" or "no live adapters" claim unless this test
  passes and the lookalike guard is clean.

**Review applicability:** security review **required** (live-adapter exclusion);
adversarial testing **required** (the lookalike-envelope rejection in 2.A is the
adversarial surface for this boundary); UX/API review **not applicable**;
browser review **not applicable**.

---

## Phase 2.G - Source-isolation and deferred-source-owner guards

**Risk:** `high` (a provider SDK, database import, or CRM/Tutor lookalike in the
controlled-imports source breaks the provider-neutral, source-isolated
boundary).

**Targeted Red command (AST fixture tests; these pass now and must stay green):**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "detects provider, database, runtime, raw SQL"
```

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "detects every deferred source-owner marker"
```

**Green gate (after `controlled-imports.ts` exists, these must also pass):**

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "keeps deferred CRM and Tutor adapters"
```

```bash
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts \
  -t "keeps controlled-import production code behind compiler-checked"
```

**Closeout gate (2.G):**
- `collectControlledImportBoundaryViolations` detects every forbidden import
  (`googleapis`, `@reading-advantage/db`, `drizzle-orm`, `postgres`,
  `@aws-sdk/`, `@google-cloud/`, `firebase-admin`), import-escape (relative
  import outside finance-operations), dynamic import, runtime access (`fetch`,
  `require`, `WebSocket`, `XMLHttpRequest`), runtime global (`process`, `Bun`,
  `Deno`), database call (`select`, `insert`, `update`, `delete`, `query`,
  `execute`, `transaction`), and raw SQL (`sql` template).
- `collectDeferredSourceOwnerLookalikes` detects every deferred source-owner
  marker (`CustomerBillingCatalogPort`, `TutorFinancialExportPort`,
  `crm-customer-billing-catalog`, `tutor-financial-export`) in a synthetic
  source and returns `[]` for the real `controlled-imports.ts`.
- The accepted Phase 1 architecture guards
  (`architecture-boundary.test.ts`, `port-boundaries.test.ts`) remain green.

**Fixtures and mocks:** synthetic source-text fixtures for the AST walker. No
production code execution for the fixture tests.

**Live-behavior proof expectation:** none. 2.G is a source-structure guard.

**Architecture guardrails / changed-contract risks:**
- When Jr-green creates `controlled-imports.ts`, the two guard tests that
  currently assert `existsSync` is `false` must be updated by Mid-red to read
  the real source and run the boundary/lookalike checks. The Mid-red role must
  not delete these checks; it must activate them.
- The `CONTROLLED_IMPORTS_PATH` constant resolves to
  `../controlled-imports.ts`. If the module is placed at a different path, the
  guard tests miss it. The path is a changed-contract risk.

**Anti-pattern coverage:**
- **A1 / A4** - The AST walker tests use explicit synthetic fixtures
  (`'import { google } from "googleapis";'` etc.) and assert exact violation
  kinds. Falsifier: a real forbidden import in `controlled-imports.ts` produces
  a violation and fails the activated guard.
- **A7** - The deferred-source-owner markers are an explicit `as const` array,
  not a bare-word filter. Each marker is a discrete falsifier.
- **A14** - The AST walker uses `ts.createSourceFile` (TypeScript compiler),
  not `rg -nE`. No ripgrep encoding-option bug is possible.

**Review applicability:** security review **required** (source isolation,
provider neutrality); adversarial testing **required** (the synthetic fixture
matrix and the lookalike marker matrix); UX/API review **not applicable**;
browser review **not applicable**.

---

## Phase 2.H - Closeout gate

**Risk:** `medium` (integration/aggregate gate; catches cross-boundary drift
and regression in accepted Phase 1 suites).

**Closeout commands (all must exit 0):**

```bash
# Phase 2 controlled-imports suite (all 24 tests; the 4 guard tests must be
# updated by Mid-red to check the real source after Jr-green creates it)
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-phase2.red.test.ts

# No regression in accepted Phase 1 suites
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/architecture-boundary.test.ts \
  src/modules/finance-operations/__tests__/port-boundaries.test.ts \
  src/modules/finance-operations/__tests__/authorization-audit.test.ts \
  src/modules/finance-operations/__tests__/money-history.test.ts \
  src/modules/finance-operations/__tests__/contracts.test.ts \
  src/modules/finance-operations/__tests__/independent-review-blockers.red.test.ts \
  src/modules/finance-operations/__tests__/postgres-record-repository.red.test.ts \
  src/modules/finance-operations/__tests__/provenance-whitespace.red.test.ts \
  src/modules/finance-operations/__tests__/historical-private-evidence-packet.red.test.ts \
  src/modules/finance-operations/__tests__/durable-job-adapter.red.test.ts \
  src/modules/finance-operations/__tests__/historical-private-evidence-binding-adapter.red.test.ts

# Accepted Phase 1 Task 3 boundary suites
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/company-identity/__tests__/finance-authorization-adapter.red.test.ts \
  src/modules/company-identity/__tests__/protocol-safety.red.test.ts

CI=true pnpm --filter @reading-advantage/storage exec vitest run \
  src/__tests__/finance-private-evidence-read.red.test.ts

# Type/lint
pnpm --filter @reading-advantage/backend run check-types
pnpm --filter @reading-advantage/storage run check-types
pnpm --filter @reading-advantage/backend exec eslint src/modules/finance-operations
pnpm --filter @reading-advantage/storage run lint
pnpm --filter @reading-advantage/backend run build
```

**Intentionally-red aggregate-suite handling:**

During Phase 1, `controlled-imports-phase2.red.test.ts` was the
intentionally-red Phase 2 aggregate that had to stay red. For Phase 2 Task 1,
this test is the **target that must go green**. It is no longer an
intentionally-red aggregate.

The backend aggregate suite (`pnpm --filter @reading-advantage/backend run
test` or `pnpm turbo run test`) is expected to remain **red** overall during
Phase 2 because of pre-existing unrelated failures (Standard Pack cross-root
configuration, Planned Game Intake typing - recorded in the Phase 1 foundation
acceptance). The acceptance role must use the **focused** commands above, not
the aggregate, for the Green/closeout gate, and must record which aggregate reds
are pre-existing/unrelated versus Phase-2-caused.

If a Phase 2 Task 2 pilot-specific red test is written by Mid-red (for the full
reconciled-month pilot), it must remain intentionally red until Task 2 is
admitted. The closeout gate must assert any such pilot test stays red:

```bash
# If a pilot-specific red test exists, it must stay red during Task 1
CI=true pnpm --filter @reading-advantage/backend exec vitest run \
  src/modules/finance-operations/__tests__/controlled-imports-pilot-phase2task2.red.test.ts \
  && echo "UNEXPECTED GREEN - pilot task must stay red until Task 2" && exit 1 \
  || echo "expected red: pilot task correctly unresolved"
```

If no pilot-specific red test exists yet, this check is not applicable for Task
1 closeout.

**Source-isolation gates (must stay green):**

- `finance-operations/architecture-boundary.test.ts` and
  `port-boundaries.test.ts` must exit 0. These enforce the same
  provider/db/runtime isolation for all finance-operations source files,
  including the new `controlled-imports.ts`.
- The `controlled-imports-phase2.red.test.ts` AST boundary walker
  (`collectControlledImportBoundaryViolations`) must return `[]` for the real
  `controlled-imports.ts` after Green.
- The deferred-source-owner lookalike guard
  (`collectDeferredSourceOwnerLookalikes`) must return `[]` for the real
  `controlled-imports.ts`.
- No cross-database reads, no shared credentials, no direct provider SDK use
  (spec "Integration constraints"). The acceptance role greps the Phase 2 diff
  for forbidden imports.

**Artifact/documentation tests vs live behavior tests:**

- **Behavior tests (live logic):** 2.A through 2.F. They execute real production
  code through injected fakes and assert runtime decisions, call sequences,
  immutability, rejection, and concurrent safety. These are the Green gate.
- **AST/source-isolation tests:** 2.G. They execute a TypeScript AST walk over
  source structure. They are falsifiable by adding a forbidden import or a
  deferred-source-owner marker. They are behavior tests over source structure,
  not documentation tests.
- **Live-DB behavior tests:** none required for Task 1. The atomic repository
  is an injected port. A live-PostgreSQL proof of the concrete
  `applyBatchAtomically` adapter is a closeout follow-up, not a Task 1 gate.
- **Artifact/documentation tests:** none introduced by Task 1. The acceptance
  and final-acceptance docs are not tests; A5/A6 forbid claiming green from
  prose. The `historical-private-evidence-mvp-decision-20260811.md` is an
  owner-boundary decision candidate, not accepted evidence; the strategy
  references it as context only.

**Disposable PostgreSQL use (if a live-DB proof is added as a follow-up):**

If Jr-green or the acceptance role adds a live-PostgreSQL integration test for
the concrete `applyBatchAtomically` adapter, it must follow the Phase 1 Task 2
pattern:

- Use a disposable, randomly-named test database. Never use
  `reading_advantage`, `primary_advantage`, or `science_advantage`.
- Use a least-privilege role scoped to the disposable database. Never reuse
  production or cross-database credentials.
- Gate the test with `describe.skipIf(!databaseUrl)` and a generous timeout.
- Migrate via the reviewed Finance journal before each proof.
- Cleanup verification must find 0 remaining temporary databases and 0
  remaining temporary roles.

**Risk class for closeout:** `medium` (integration gate; the individual
boundaries carry the high/critical risk).

**Anti-pattern coverage (closeout-wide):**
- **A8** - All Phase 2 plan markers must be `[~]`, `[x]`, or `[b]`; `[ ]`
  (space) is forbidden. The orchestrator marker-vocabulary guard covers this.
- **A9** - This strategy and all tests reference the active track path
  `measure/tracks/company_finance_operations_20260810/`, not an archive path.
- **A10** - No `measure/generated/` facts are touched by Phase 2; if structural
  changes occur, `build-graph update` is the owning role's responsibility.
- **A12** - Any guard test referenced by this strategy must exist; the
  acceptance role confirms `architecture-boundary.test.ts`,
  `port-boundaries.test.ts`, and the Phase 2 red test resolve.
- **A15** - Any role receipt produced for Phase 2 must bind the
  post-strategy-commit `phase_base_sha` and the green commit; stale Phase 1
  receipts are not valid Phase 2 evidence.
- **A16** - Preflight: exactly one shared master worktree on `master` before
  every closeout action.

**Review applicability (Phase 2 Task 1 overall):**
- **Security review:** required for 2.A, 2.B, 2.E, 2.F, 2.G (data minimization,
  replay integrity, authorization root, atomic integrity, live-adapter
  exclusion, source isolation).
- **UX/API review:** not applicable. Task 1 has no UI and no external HTTP API.
  The controlled-imports functions are internal backend ports.
- **Adversarial testing:** required for 2.A, 2.B, 2.C, 2.D, 2.E, 2.G. The
  forbidden-key matrix, unsafe-text matrix, cross-company/digest/scope mismatch
  matrix, lookalike-envelope rejection, collision-freedom matrix, denial and
  scope-mismatch paths, staging-failure rollback, concurrent accepted+replay,
  concurrent accepted+conflict, and the synthetic AST fixture matrix are the
  adversarial surface.
- **Browser review:** not applicable. No browser behavior is introduced or
  changed by Task 1.

---

## Policy neutrality and forbidden boundaries

This strategy preserves policy neutrality. The Phase 2 Green implementation
must not:

1. **Guess Thai policy.** `thaiTaxDocumentStatus` may be only
   `"not-source-asserted" | "unresolved"`. Source-stated WHT, GST, dates, and
   document classes are preserved as text labels, never interpreted. No VAT
   rate, withholding rate, account code, ledger account, deductibility, bank
   account, or tax ID may appear in normalized output.
2. **Read live CRM or Tutor databases.** The pilot returns
   `liveSourceAdaptersUsed: []`. The source-owner lookalike guard rejects
   `CustomerBillingCatalogPort`, `TutorFinancialExportPort`,
   `crm-customer-billing-catalog`, and `tutor-financial-export` markers.
3. **Create source lookalike envelopes.** Only
   `private-evidence-storage` source-acceptance port receipts are accepted.
4. **Use cross-database credentials.** The AST boundary guard rejects
   `@reading-advantage/db`, `drizzle-orm`, `postgres`, and all provider SDK
   imports. No shared credentials, no direct provider SDK use.
5. **Revert Phase 1 boundaries.** The accepted Company Identity attestor,
   private-evidence reader, durable outbox projector, and packet contract must
   remain green and unchanged in their public contracts.

## Falsifiability statement

Every test named in this strategy has an explicit falsifier:
- 2.A: accept a forbidden key, return a floating-point amount, alias the input,
  or accept a CRM/Tutor lookalike envelope.
- 2.B: return the wrong conflict reason, alias the accepted record IDs, or
  mutate the existing input.
- 2.C: alias the input money/provenance, mutate the accepted record, or omit
  the supersession reason.
- 2.D: use a naive concatenation key that collides on delimiter-bearing inputs.
- 2.E: call the repository before authorization, skip the denial audit, alias
  the repository return, fail to roll back on staging failure, or resolve
  concurrent identical commands as two accepted batches.
- 2.F: return a non-empty `liveSourceAdaptersUsed` array.
- 2.G: add a forbidden import or a deferred-source-owner marker to
  `controlled-imports.ts`.
- 2.H: regress an accepted Phase 1 suite or satisfy a pilot-specific red test
  that must stay red.

A claim of "green" or "accepted" for Phase 2 Task 1 is true if and only if
every focused command in Phase 2.H exits 0, the controlled-imports suite is
fully green (all behavior tests pass and the guard tests check the real
source), no accepted Phase 1 suite regresses, and the source-isolation guards
return clean. Any other state refutes the claim.
