# Test strategy: Sales Advantage shared Mastery consumer

> Bounded to Phase 0 closeout and Phase 2 docs-only strategy/contract design of
> `sales_mastery_consumer_20260810`. Phase 1 is accepted (commit `86a6503ac`);
> Phase 2 Red/source/migration execution and Phases 3 to 4 remain blocked. This
> strategy owns no production or test source; it only directs the Phase 0
> Red/Green/closeout gates and records the bounded Phase 2 design boundary.

## Phase scope and hard boundaries

| Phase | State | This strategy |
|-------|-------|---------------|
| Phase 0 - reconcile and admit the consumer | Task A accepted; Task B remains `[~]` | Shared-root closeout gates are globally blocked; Phase 0 is not closed |
| Phase 1 - bind the approved course to a knowledge graph | Accepted (`86a6503ac`) | Reference only; regression-guarded, not re-opened |
| Phase 2 - company tenant mapping and durable projection | Docs-only strategy/contract design active | Finance ordering prerequisite accepted; all Red/source/migration execution stays `[b]` behind Phase 0 Task B closeout |
| Phase 3 - project Sales evidence into KST/SRS | Blocked behind Phase 2 | No tests defined |
| Phase 4 - verification and release | Blocked behind Phase 3 | No tests defined |

Hard boundaries for Phase 0:

- No Phase 2 database, tenant, or schema-mapping source work in Phase 0. The
  Finance ordering prerequisite is now accepted, but Phase 2 Red/source/migration
  execution remains blocked behind Phase 0 Task B shared-root closeout.
- No CRM, customer, licensing, invoice, payroll, revenue, or commission
  behavior.
- No changes to the four shared engine packages
  (`knowledge-space-core`, `knowledge-space-practice`, `practice-core`,
  `srs-engine`).
- No changes to the Phase 1 accepted `@reading-advantage/sales-knowledge`
  package. It is consumed as an immutable, already-reviewed release.
- No browser, deploy, or production-QA behavior. Those are Phase 4.

## Phase 0 - reconcile and admit the consumer (one-shot Red/Green)

### Ownership of the one-shot

Phase 0 admits Sales as an explicitly allow-listed runtime consumer through one
Red->Green cycle. The Red phase checks in the contract spec (the Sales consumer
descriptor and the failing admission test). The Green phase makes that contract
pass by extending only the `@reading-advantage/mastery-runtime-compat`
governance layer.

Red phase delivers (contract spec, expected to fail):

- `packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json` - the
  exact Sales consumer descriptor.
- `packages/mastery-runtime-compat/src/__tests__/sales-runtime-admission.red.test.ts`
  - the failing admission, containment, and packed-consumer tests.

Green phase delivers (implementation, expected to pass):

- `packages/mastery-runtime-compat/runtime-manifest.json` - one new Sales
  release set, additive to the existing Codecamp release set.
- `packages/mastery-runtime-compat/src/index.ts` - extend
  `ConsumerDescriptorSchema` with optional `evidence` and `salesKnowledge`
  fields; add the stable issue codes the Red suite asserts.
- `packages/mastery-runtime-compat/src/release-artifact.ts` - extend the packed
  gate to build and pack `sales-knowledge`, accept caller-owned descriptor
  paths, and emit the Sales attestation.
- `packages/mastery-runtime-compat/fixtures/consumer/check-consumer.mjs` -
  verify the packed Sales knowledge through its public verifier and emit the
  attestation.
- `packages/mastery-runtime-compat/src/__tests__/release-artifact.test.ts` -
  update to the extended gate contract in the same Green commit.

### Red command (targeted, intentionally red)

```bash
pnpm --filter @reading-advantage/mastery-runtime-compat exec vitest run \
  src/__tests__/sales-runtime-admission.red.test.ts --maxWorkers=1
```

Expected at Red: non-zero exit. The test must fail on substantive assertions,
not on a missing file or a syntax error. The Red suite must assert at least:

1. The manifest declares exactly one Sales release set with an `id` distinct
   from `mastery-runtime-0.1.0-kst-srs-3.2`, pinned to
   `knowledge-space-sales-mastery-v1.0.0`, with the reviewed runtime axes
   (`kst-srs.v3.2`, `practice.v1`, `srs.contract.v2`,
   `mastery.persistence.v1`, `0028_mastery_tenant_hardening`,
   `mastery-fixtures.v3.2.0`, source commit
   `34f9fb508c3e1751518aec335af3040c381d1d12`) and
   `supportedConsumers: [{ name: "sales-advantage", range: ">=0.1.0 <0.2.0" }]`.
2. `JSON.stringify(salesReleaseSet)` does not contain the substring `codecamp`.
3. The checked-in `sales-advantage.json` descriptor validates and binds the
   exact Phase 1 digests: graph
   `5f2b35f7178f0fed9ca103959d59d5e75c0f4818eac355c14a1be270776a9808`,
   bindings
   `e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197`,
   release-candidate byte
   `723198653a09417f92b597a3faefe919e3d83504f3320f9d962ac0ea1f8b2168`,
   approval byte
   `8b058a5b66631bbffe662a131eed5330bb0c12fa10134a096378e9a4c8bff404`,
   static-seed byte
   `0519b43a6c1a177bcbd7f06fe4d9cf86225afedd5af1f0b76e2aa04c4f3d13ec`.
4. The public `@reading-advantage/sales-knowledge` exports
   `verifySalesReleaseEvidence` and `salesReleaseEvidenceManifest` with the
   accepted `releaseId`.
5. The gate accepts the honest Sales descriptor with
   `{ compatible: true, issues: [] }`.
6. The gate rejects, with stable issue codes and non-empty `path`/`message`:
   missing `evidence` (`MISSING_RELEASE_EVIDENCE`), missing `salesKnowledge`
   (`MISSING_SALES_KNOWLEDGE_IDENTITY`), tampered graph digest
   (`GRAPH_EVIDENCE_DIGEST_MISMATCH`), tampered bindings digest
   (`BINDINGS_EVIDENCE_DIGEST_MISMATCH`), tampered static-seed digest
   (`SALES_KNOWLEDGE_EVIDENCE_MISMATCH`), the Codecamp graph release
   `knowledge-space-synthetic-codecamp-proof-v1.0.0`
   (`GRAPH_RELEASE_MISMATCH`), and the Codecamp release-set id
   (`UNSUPPORTED_CONSUMER`).
7. The packed-consumer gate builds and packs the four engines plus
   `@reading-advantage/sales-knowledge`, offline-installs them in an isolated
   clean consumer, runs the Sales verifier against packed bytes, and emits an
   attestation whose `consumer.name`, `consumer.version`, and
   `salesKnowledge.releaseId` match the copied descriptor.
8. Containment: the packed gate and the clean-consumer script reject a symlinked
   descriptor, a symlinked gate, a symlinked caller root, an outside-repository
   root, and an in-repository root outside `.cache`; a failed child is removed
   without deleting a caller-owned sentinel file; parallel successful runs in
   the same caller root preserve the sentinel.

### Green gate

The Red command above must exit zero after the Green implementation lands.
In addition, the existing Phase 0-adjacent contract tests must still pass, to
prove the admission is additive and does not regress the Codecamp path:

```bash
pnpm --filter @reading-advantage/mastery-runtime-compat exec vitest run \
  src/__tests__/runtime-manifest.test.ts --maxWorkers=1
pnpm --filter @reading-advantage/mastery-runtime-compat exec vitest run \
  src/__tests__/codecamp-proof.test.ts --maxWorkers=1
pnpm --filter @reading-advantage/mastery-runtime-compat exec vitest run \
  src/__tests__/release-artifact.test.ts --maxWorkers=1
```

The Green gate is met only when the Red command exits zero AND all three
contract-regression commands above exit zero.

### Closeout gate (Task B; shared-root gate blocked)

This is Phase 0 Task B. Task A is accepted, and Task B remains `[~]`; the broad
shared-root doctor and generate/structural gates are currently blocked globally.
It is not closed and does not claim doctor Green. Once those root gates are
runnable, Task B must pass:

```bash
# Lint and type-check the two packages in scope.
pnpm --filter @reading-advantage/mastery-runtime-compat run lint
pnpm --filter @reading-advantage/mastery-runtime-compat run check-types
pnpm --filter @reading-advantage/sales-knowledge run lint
pnpm --filter @reading-advantage/sales-knowledge run check-types

# Focused test suites (NOT the aggregate turbo run).
pnpm --filter @reading-advantage/mastery-runtime-compat run test
pnpm --filter @reading-advantage/sales-knowledge run test

# The CLI consumer checker against the admitted Sales descriptor.
pnpm --filter @reading-advantage/mastery-runtime-compat run build
node packages/mastery-runtime-compat/dist/check-consumer.js \
  packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json
```

Plus a no-shared-engine-changes guard against the immutable `phase_base_sha`
(captured after this strategy commit; see the capture point below):

```bash
git diff --name-only <phase_base_sha> -- \
  packages/knowledge-space-core \
  packages/knowledge-space-practice \
  packages/practice-core \
  packages/srs-engine \
  packages/sales-knowledge
# Expected output: empty. No engine or Sales-knowledge source may change.
```

Plus independent review evidence recorded as a role receipt that binds the
final commit, the gate outputs, and the current output hashes (A15 defense).

### Fixtures, mocks, and live-behavior proof expectations

Fixtures (checked-in contract data):

- `fixtures/consumer/sales-advantage.json` - the Sales consumer descriptor. This
  is the contract spec, checked in at Red.
- `fixtures/consumer/consumer.json` - the existing Codecamp descriptor. Must
  remain valid and unmodified.
- `fixtures/consumer/package.json` - the clean-consumer fixture manifest. Must
  remain a no-dependency skeleton.
- `runtime-manifest.json` - the authoritative governance manifest. Green adds
  one release set; it must not edit the existing Codecamp release set.

Mocks: none. The Phase 0 gate forbids mocking the engine packages, the Sales
knowledge verifier, or the filesystem. The compatibility evaluator may be called
directly with in-memory descriptor clones for the rejection assertions, but the
packed-consumer proof must use real subprocesses.

Live-behavior proof expectations:

- The packed-consumer test must perform a real `tsc` build of the four engines,
  `sales-knowledge`, and `mastery-runtime-compat`.
- It must perform a real `npm pack --dry-run` and a real `npm pack` of each
  staged package, then a real `npm install --offline` in the isolated consumer.
- It must import the packed `@reading-advantage/sales-knowledge` entrypoint and
  call `verifySalesReleaseEvidence` against the packed evidence bytes.
- It must emit a `sales-runtime-attestation.v1` JSON attestation whose
  `verification.valid` is `true` and whose `compatibility.compatible` is `true`.
- The clean-consumer script must reject a symlinked descriptor or gate before
  reading or importing it, using `lstat` plus `realpath` containment checks.

### Artifact/documentation tests vs live behavior tests

Artifact/contract tests (data shape, no subprocesses):

- Manifest schema validation via `parseRuntimeManifest`.
- Descriptor schema validation via `ConsumerDescriptorSchema`.
- Digest equality assertions (graph, bindings, source, seed SHA-256 values).
- Rejection assertions on cloned descriptors with `evaluateConsumerCompatibility`.
- The `JSON.stringify(salesReleaseSet)` must-not-contain-`codecamp` assertion.

These are falsifiable: a wrong digest, a missing field, or a Codecamp string in
the Sales release set fails the test.

Live behavior tests (real build/pack/install/verify):

- The packed-consumer gate (`runReleaseArtifactCheck` with the Sales
  descriptor).
- The Sales knowledge verifier execution against packed bytes.
- The containment and symlink-rejection filesystem operations.
- The concurrency and cleanup filesystem operations.

These are falsifiable: a build failure, a missing export in the packed tar, a
network-dependent install, a symlink that escapes containment, or a sentinel
file that disappears fails the test.

### Architecture guardrails

- The four engine packages and `sales-knowledge` must not change. The closeout
  `git diff --name-only` guard enforces this.
- The Sales release set must be a new, distinct entry. It must not mutate the
  existing Codecamp release set, its graph release, or its `supportedConsumers`.
- The `ConsumerDescriptorSchema` extension must be additive and optional. The
  Codecamp descriptor (which has no `evidence` or `salesKnowledge` fields) must
  still validate. The existing `runtime-manifest.test.ts`
  `createCompatibleConsumer` path must still pass.
- The packed gate must remain offline and network-free
  (`npm_config_offline: "true"`). No registry publication.
- The packed gate must not retain `workspace:`, `file:`, `link:`, `portal:`, or
  `catalog:` protocols in packed metadata. The
  `nonPublishableDependencyReferences` check must return an empty list.
- The clean-consumer fixture must not gain a runtime dependency on
  `@reading-advantage/sales-knowledge` at the fixture `package.json` level. The
  Sales package is resolved through the packed archive, not through the
  workspace.
- The Sales descriptor must bind the Phase 1 accepted digests exactly. It must
  not recompute or re-infer them.

### Changed-contract risks

1. **`runReleaseArtifactCheck` signature change** (no-args ->
   `{ temporaryRoot, consumerDescriptorPaths }`). This is a breaking change to
   the packed-gate contract. The existing `release-artifact.test.ts` at HEAD
   calls `runReleaseArtifactCheck()` with no arguments. Green must update that
   test in the same commit. Risk: a stale caller outside this package would
   break. Mitigation: `build-graph callers` shows no external caller outside
   `mastery-runtime-compat`; the only caller is the in-package test.
2. **`check-consumer.mjs` behavior change**. The committed script calls
   `runConsumerCompatibilityGateFromPath(descriptorPath)`. The Green script
   reads the descriptor itself (with containment checks) and calls
   `runConsumerCompatibilityGate(descriptor)`, then emits an attestation. The
   `runConsumerCompatibilityGateFromPath` export remains available. Risk: the
   fixture script's invocation contract changes.
3. **`PACKAGED_DIRECTORIES` adds `sales-knowledge`**. The packed gate now packs
   five packages, not four. `result.packages` shape changes. The
   `release-artifact.test.ts` expectation must be updated.
4. **`tmpdir()` -> caller-owned `.cache` root**. The committed gate writes to
   the OS `/tmp`. The Green gate requires a caller-supplied root beneath the
   repository `.cache` directory (gitignored). Risk: a caller that passes no
   root or an outside-`.cache` root fails.
5. **`pnpm` -> `npm` in the release-artifact gate**. The committed gate uses
   `pnpm pack` and `pnpm install`. The Green gate uses `npm pack` and
   `npm install --offline`. Risk: portability and offline-cache behavior
   differ. Mitigation: the gate sets `npm_config_offline`, `npm_config_cache`,
   and isolated state roots.
6. **`ConsumerDescriptorSchema` strictness**. The schema is `.strict()`. Adding
   `evidence` and `salesKnowledge` must be done by extending the schema object,
   not by relaxing strictness. Risk: an unknown field would still be rejected,
   which is the desired fail-closed behavior.

### Intentionally-red aggregate-suite handling

The repository aggregate `pnpm turbo run lint` and `pnpm turbo run test` are
intentionally red from pre-existing failures outside this track (49
primary-advantage ESLint errors, mixed Jest/Vitest runners, Prisma remnants).
The Phase 0 gate must not use the aggregate. It must use the focused
`--filter @reading-advantage/mastery-runtime-compat` and
`--filter @reading-advantage/sales-knowledge` commands above.

This is the A7 defense: an over-broad aggregate filter would swallow a real
Phase 0 regression inside pre-existing red noise. The focused filter makes a
real Phase 0 failure visible.

The aggregate red state is acceptable for this track and must not be "fixed" by
Phase 0. Phase 0 must not edit files outside
`packages/mastery-runtime-compat` (and the strategy/plan under `measure/`).

### Risk classification: HIGH

Phase 0 is HIGH. Reasons:

- It changes the contract of the shared compatibility gate
  (`runReleaseArtifactCheck` signature, packed-package set, clean-consumer
  script).
- The packed-consumer proof is a live behavior test with real subprocesses,
  offline installs, and filesystem containment.
- The containment guards are security-relevant (symlink escape, outside-repo
  writes).

It is not CRITICAL because it owns no database, no tenant mapping, no production
deployment, and no engine source. It is not MEDIUM because the contract change
is breaking and security-relevant.

### Applicability

| Review type | Applicable | Notes |
|-------------|-----------|-------|
| Security review | Yes | Containment guards (symlink rejection, outside-`.cache`/outside-repo rejection), offline-only install, descriptor tampering rejection, provenance binding, fail-closed schema. |
| UX/API review | Partial | No UI. The API surface is the compatibility gate contract. The `runReleaseArtifactCheck` signature change and the new issue codes are the API review points. |
| Adversarial testing | Yes | Tampered digests, missing evidence, Codecamp graph reuse, Codecamp release-set reuse, symlinked descriptor/gate/root, outside-repo root, outside-`.cache` root, concurrent cleanup. |
| Browser review | No | Phase 0 is runtime-compat only. No browser behavior. Phase 4 owns browser QA. |

### Anti-pattern coverage for Phase 0

| Anti-pattern | Defense in Phase 0 |
|---|---|
| A3 (digit-only as a labeled count) | The Red suite asserts labeled package maps (`ENGINE_PACKAGE_VERSIONS` with named keys) and explicit SHA-256 strings. No assertion matches a bare digit. Falsification: a wrong version key or digest fails the equality. |
| A4 (vacuous-pass on nothing-done) | The Red command must exit non-zero at Red and zero at Green. The Red suite has at least eight substantive assertion groups. An empty implementation cannot pass. Falsification: the gate with no Sales release set fails the first assertion. |
| A5 (false-claim text vs test reality) | The plan task text cites the exact focused commands above. No plan text may claim "all checks pass" unless the cited command exits zero. Falsification: run the cited command; a non-zero exit refutes the claim. |
| A6 (registry-note overstatement) | The `tracks.md` entry and this strategy must not claim Sales is "admitted" or "accepted" until the Green gate and closeout gate pass. Falsification: a red Red command or a failing closeout guard refutes "admitted". |
| A7 (over-broad filter swallowing real hits) | The gate uses `--filter @reading-advantage/mastery-runtime-compat` and `--filter @reading-advantage/sales-knowledge`, not `pnpm turbo run test`. Falsification: a Phase 0 regression fails the focused command even when the aggregate is already red. |
| A10 (generated-facts drift) | If Green changes package structure, `measure/generated/` must be regenerated. The closeout gate runs `bash measure/doctor.sh` and treats Check 5 as advisory. Falsification: a stale generated fact fails the doctor. |
| A14 (invalid ripgrep option) | Any audit detector in this strategy uses `rg -n '<regex>'`, never `rg -nE`. Falsification: `rg -nE` exits 2 and is treated as a failure, not a zero-hit result. |
| A15 (stale role-receipt hashes) | If the closeout produces a role receipt that enumerates output SHA-256 values, a later Green fix must refresh the receipt. Falsification: `bash tests/orchestrator_role_receipt_integrity.sh` fails on a stale receipt. |

## Phase 1 - accepted reference (no active tests)

Phase 1 is accepted at commit `86a6503ac` with the digest and evidence record in
`phase1-sales-graph-acceptance-20260811.md`. This strategy does not re-open
Phase 1. The Phase 0 closeout re-runs the `@reading-advantage/sales-knowledge`
test, lint, and type-check gates as a regression guard only. A Phase 1
regression blocks Phase 0 closeout.

Anti-pattern coverage for Phase 1 (reference): A5 and A6. The acceptance doc
cites exact digests and test counts that were verified at acceptance. The
Phase 0 strategy must not restate those counts as live claims; it references the
immutable acceptance doc.

## Phase 2 - docs-only strategy/contract design (CRITICAL)

The Finance ordering prerequisite is accepted: the additive/journaled
`0003_finance_attestation_audit_metadata` migration and
`meta/0003_snapshot.json` landed in
`48470311d4f6b06b7e9ebcce7ba1f380444f0a79`, with Finance Task 3 final
acceptance recorded on 2026-08-13. This removes only the stale Finance ordering
block. It authorizes documentation-only Phase 2 strategy/contract design; it
does not authorize Red tests, source changes, migrations, or a Phase 2 Green
claim before Phase 0 Task B shared-root closeout and final acceptance.

The active design is bounded to these future contracts and falsifiable test
groups; this transition creates neither the contracts nor the tests:

1. A fail-closed mapping consumes only the verified Company Identity tuple
   `(applicationKey=sales, organizationId, organizationKey)` and resolves one
   dedicated Mastery tenant. A caller cannot choose a tenant, derive one from
   frontend input, or use Codecamp's reserved namespace.
2. A durable projection command binds the authenticated organization, Sales
   learner principal, source application, graph release, source-attempt identity,
   and payload digest. Equal replay returns its original receipt; a conflicting
   replay fails closed; mutations remain append-only and retry-safe.
3. The future Red suite must cover mapping reuse and cross-organization denial,
   equal/conflicting replay, retry, concurrency, and append-only outbox behavior.
   Its exact files and commands remain unselected until the dedicated strategy
   acceptance described below.
4. The implementation must consume the existing Mastery/activity adapters,
   leave the four shared engines and `sales-knowledge` immutable, and preserve
   Codecamp namespace exclusion.

Risk classification: CRITICAL. Phase 2 owns database tenant mapping,
cross-organization isolation, and idempotent projection. A defect there leaks
knowledge state across organizations or duplicates evidence.

Anti-pattern coverage: A5/A6 prevent a documentation outline from being called
Red, Green, or accepted execution; A11 keeps the active `[~]` marker limited to
real docs-only strategy/contract work. Every Phase 2 execution task remains
`[b] deferred:phase0-task-b-closeout`, a real external gate rather than a review
placeholder.

## phase2_base_sha capture point (future)

Do not capture or record `phase2_base_sha` in this transition. Only after a
later dedicated Phase 2 strategy/contract acceptance commit has been reviewed,
accepted, and committed may the orchestrator capture that acceptance commit's
exact SHA (for example, `git rev-parse <accepted-strategy-commit>`) and record it
as `phase2_base_sha`. That SHA is then the baseline for future Phase 2 Red and
source/migration guards; no earlier SHA authorizes execution.

## Phase 3 - blocked (project Sales evidence into KST/SRS)

Phase 3 stays `[b]` behind Phase 2. No tests are defined here. Risk
classification: HIGH. It owns mastery mutation, AI rate limiting, and audit.

## Phase 4 - blocked (verification and release)

Phase 4 stays `[b]` behind Phase 3. No tests are defined here. Risk
classification: HIGH. It owns deploy and authenticated browser QA.

Browser review applicability is Phase 4 only. It is explicitly out of scope for
Phase 0.

## phase_base_sha capture point

The orchestrator must capture the immutable `phase_base_sha` immediately after
the commit that lands this strategy and the plan update. The capture command:

```bash
git rev-parse HEAD
```

Run this after the strategy+plan commit succeeds. The returned SHA is the
Phase 0 base. The closeout no-shared-engine-changes guard diffs against this
SHA. Do not embed a SHA that predates the committed strategy. If the strategy
is later refreshed, capture a new `phase_base_sha` from the new strategy
commit.

## Falsifiability summary

Every test in this strategy has a falsification condition:

- Red command exits non-zero at Red, zero at Green. Falsification: a Sales
  release set absent from the manifest, a descriptor rejected by the strict
  schema, or a packed gate that does not verify Sales knowledge.
- Codecamp-reuse rejection: a descriptor with the Codecamp graph release must be
  rejected with `GRAPH_RELEASE_MISMATCH`. Falsification: the gate accepts it.
- Provenance binding: a tampered digest must be rejected with a stable code.
  Falsification: the gate accepts a wrong SHA-256.
- Containment: a symlinked descriptor or an outside-`.cache` root must be
  rejected. Falsification: the gate writes through it.
- No-engine-changes: the `git diff --name-only` guard must be empty.
  Falsification: an engine file appears in the diff.
- Additive Codecamp path: the existing `runtime-manifest.test.ts`,
  `codecamp-proof.test.ts`, and `release-artifact.test.ts` must still pass.
  Falsification: a Codecamp assertion fails after the Sales admission.
