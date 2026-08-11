# Phase S4 Test Strategy: Calibrate and Release Safely (Bounded Release-Approval Remediation)

**Track:** `codecamp_pr_mastery_evaluation_20260710`
**Phase:** S4 - Calibrate and release safely (spec.md#story-s4)
**Strategy revision:** 2026-08-11 (initial strategy for the bounded release-approval remediation)
**Product-owner decision (2026-08-11):** selected label `Approve active rollout`,
approving the current active Codecamp PR-review rollout at HEAD, bounded to
advisory PR feedback. **This approval does not close S4's other
human/browser/evaluation gates.**

## 0. Baseline validation and current phase state

### 0.1 SHA anchors (all verified against this repository)

| Anchor | SHA | Resolution |
|--------|-----|------------|
| Supplied immutable phase base | `60397049ed50838bab109bf25af0a1972ab2b05e` | Valid commit: `fix(mastery): enforce declared runtime dependencies` (2026-07-10). Parent of track-creation `ac98cb5d`. This is the truthful pre-track immutable anchor for S4. |
| Active-rollout introducing commit | `508fac6fd6b75af7cb1fd502c1aab7013388796b` | Valid commit: `fix(codecamp): repair PR review worker` (2026-08-11). Ancestor of HEAD. Introduced `CODECAMP_PR_REVIEW_ROLLOUT_MODE=active` + `CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release` in `cloudbuild.yaml`. |
| Migration-ceiling adding commit (linked hotfix) | `ee0c98bf7a30e340cc3752cc67dd32c7627f74dc` | Valid commit: `fix(db): enforce Codecamp migration ceiling` (2026-08-11, track `codecamp_duplicate_lesson_hotfix_20260810`). Added `MIGRATION_CEILING_TAG=0049_codecamp_exercise_quiz_repair` to the migrate step and `resolveMigrationCeiling()` to `packages/db/src/migration.ts`. |
| role_base_sha / current HEAD | `46f97a54d69c37f931c72069ff063d95e1525c41` | Valid commit: `chore(measure): record P4 ceiling` (2026-08-11). The revision the PO reviewed and approved. |

The supplied `phase_base_sha` `60397049` resolves as a real commit and is the
parent of track creation `ac98cb5d`. It is accepted as the truthful S4 phase
base. No SHA substitution is required. The active rollout the PO approved was
introduced at `508fac6fd` and is present, unchanged, at HEAD `46f97a54d`; the
only cloudbuild change between `508fac6fd` and HEAD is the hotfix's
`MIGRATION_CEILING_TAG` addition to the migrate step (verified by
`git diff 508fac6fd..HEAD -- apps/codecamp-advantage/cloudbuild.yaml`).

### 0.2 Implemented surface at HEAD (revalidation target)

S4 implementation tasks are `[x]` in `plan.md`. The bounded approval does not
re-implement them; it revalidates the already-shipped artifacts and binds the
PO decision to the reviewed revision. The implemented surface is:

- **Release policy** (`packages/domain/src/codecamp/pr-evaluation-release.ts`):
  `resolvePrEvaluationRuntimeRollout`, `assessPrEvaluationRelease`,
  `detectPrEvaluationModelDrift`, `decidePrEvaluationRollout`,
  `isPrEvaluationCanarySelected`, and the frozen-fixture/fixture-result/
  release-policy Zod schemas.
- **Deploy gate** (`packages/db/src/__tests__/deploy-gate-contract.test.ts`):
  parses `cloudbuild.yaml`, asserts migrate-before-deploy ordering, doctor
  `--check` before traffic, `--no-traffic` staging, active-rollout approval
  marker, and the `0049` required-migration ceiling.
- **Migration ceiling** (`packages/db/src/migration.ts`):
  `resolveMigrationCeiling` rejects empty/whitespace, unknown, duplicated, and
  non-terminal (has-successor) ceiling tags; `packages/db/scripts/migrate.ts`
  forwards `MIGRATION_CEILING_TAG`.
- **Worker deployment** (`apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`):
  asserts the internal review-worker-tick route, Secret Manager token binding,
  `CODECAMP_PR_REVIEW_ROLLOUT_MODE=active`,
  `CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release`, and the
  two-minute UTC Cloud Scheduler target.
- **Production rollout**: Cloud Run revision `codecamp-advantage-00019-682`
  shipped with `CODECAMP_PR_REVIEW_ROLLOUT_MODE=shadow`; the incident repair
  at `508fac6fd` restored the worker and the checked-in cloudbuild carries
  `active` mode with the approval marker.

### 0.3 Open S4 gates (NOT closed by this approval)

The PO's `Approve active rollout` decision is bounded. The following S4 gates
remain explicitly open and must not be claimed closed by this strategy or any
plan/registry note (A5/A6 defense):

1. Human-labelled frozen PR evaluation fixtures with explicit release thresholds.
2. Frozen/live candidate-model evaluation run against those fixtures.
3. Credentialed GitHub Checks acceptance (raw webhook payload is not test evidence).
4. End-to-end revision/redelivery and browser acceptance (Codecamp SSO-dependent).
5. graph/generate/doctor closure gates for the current HEAD.
6. Curriculum/product-owner review of the full evaluation (broader than the
   bounded rollout approval recorded here).

## 1. Purpose and proof standard

Phase S4 is complete only when executable tests prove that (a) the active
PR-review rollout is bound to a durable, revision-checked-in approval marker,
(b) fabricated or absent markers are rejected, (c) the rollout remains advisory
and cannot manufacture mastery or merge authority, (d) the migration ceiling
from the linked hotfix is not bypassed by the rollout, and (e) the closure
gates in §0.3 are either green or explicitly recorded as open.

A test that merely finds the string `active` in `cloudbuild.yaml` is not proof
of the approval contract. Source-text checks may supplement a behavioral test,
but the approval contract is proven only by parsing the deploy env-vars into a
key/value map and asserting the exact `(mode, approvedBy)` pair, plus the
runtime policy resolution that downgrades active-without-approval to shadow.

The following anti-patterns are explicit phase gates:

- **A1**: the approval-marker check must not be a substring match; it must parse
  the `--set-env-vars=` argument into a map and assert the exact key and value.
- **A3**: canary percent and fixture counts must be labeled, bounded integers,
  not digit-only regexes.
- **A4**: each command records non-zero test and assertion counts; a missing
  package is a failure (`--fail-if-no-match`), not a vacuous filtered success.
- **A5/A6**: plan, registry, and strategy claims must match the recorded
  command exit status; "active rollout approved" must not be inflated to
  "S4 complete" or "mastery mutation authorized."
- **A7**: the cloudbuild parser must not use broad path or "test" exclusions;
  it extracts exact step IDs and env-var keys.
- **A8**: plan task markers must use `[~xb]`, not legacy `[ ]`; the S4 open
  tasks currently use `[ ]` and must be converted by the plan-update role
  before supervisor execution.
- **A10**: `measure/generate.sh` + `git diff --exit-code -- measure/generated`
  must be clean after any structural change.
- **A14**: every detector uses `rg -n '<regex>'` (ripgrep default engine), never
  `rg -nE` (which treats the regex as an encoding name and exits 2).
- **A15**: any role receipt published for this strategy must bind the real
  strategy-commit SHA and current output hashes; a placeholder is not accepted.

## 2. Anti-pattern coverage per sub-tier (falsifiability)

Every test in this strategy must have a falsification condition: a named
assertion that fails on a named regression. The bounded approval adds one
sub-tier (S4.1) and revalidates the existing sub-tiers (S4.2-S4.4). S4.5
records the open closure gates.

| Sub-tier | Defends against | Defense (falsification condition) |
|----------|-----------------|-----------------------------------|
| **S4.1 Release-approval binding** (bounded PO approval) | A1 (substring), A4 (vacuous), A5/A6 (false claim / overstatement) | Parse `cloudbuild.yaml` deploy `--set-env-vars=` into a `Map<string,string>` and assert `CODECAMP_PR_REVIEW_ROLLOUT_MODE=active` AND `CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release` exactly. Refutation: remove either key, blank the approver, or change the mode -> test fails. Runtime policy: `resolvePrEvaluationRuntimeRollout({CODECAMP_PR_REVIEW_ROLLOUT_MODE:"active"})` without `RELEASE_APPROVED_BY` must return `mode:"shadow", approvalRequired:true`. Refutation: if it returns `mode:"active"`, the fail-closed guard is broken. |
| **S4.1 Fabricated-marker rejection** | A1, A4 | `assertSafePrReviewRollout({mode:"active", approvedBy:""})` throws `/approval/i`; whitespace-only `approvedBy` is trimmed to null by the runtime policy and downgraded to shadow; unknown mode value is rejected by `prEvaluationRuntimeRolloutModeSchema.parse` (Zod throws). Refutation: an empty/whitespace approver that does not throw or downgrade is a fabricated-marker acceptance bug. |
| **S4.2 Calibration harness and drift** | A3 (digit-only count), A4 | `assessPrEvaluationRelease` with a fixture/result count mismatch pushes `FIXTURE_RESULT_MISMATCH`; `detectPrEvaluationModelDrift` pushes a named drift reason per exceeded threshold. Refutation: a candidate below `minimumSchemaCompliance` that returns `eligible:true` is a vacuous pass. Counts are labeled integers compared against `fixtures.length`, not digit-only regexes. |
| **S4.3 Rollout transition safety** | A4, A5/A6 | `decidePrEvaluationRollout({mode:"shadow",...})` returns `allowLearnerMutation:false`; `mode:"active"` with ineligible report returns `allowLearnerMutation:false` and `mode:"fallback"`; shadow runtime returns `mayPublishFeedback:false`. Refutation: shadow that publishes feedback, or active-without-approval that mutates, is an advisory-scope violation. |
| **S4.4 Dispute and human override** | A5/A6 | Admin correction appends to the audit log with original attempt ID, corrected disposition, and reason; it never edits the model attempt in place and never auto-mutates mastery. Refutation: a correction that overwrites the immutable attempt or auto-promotes mastery is a history-edit bug. |
| **S4.5 Migration-ceiling adversarial** (linked hotfix) | A4, A7 | `resolveMigrationCeiling` throws on empty/whitespace, unknown, duplicated, and non-terminal (successor-exists) tags. The cloudbuild migrate step carries `MIGRATION_CEILING_TAG=0049_codecamp_exercise_quiz_repair` and runs before `deploy-cloudrun`. Refutation: a successor migration `0050` that is permitted by the ceiling, or a deploy step that runs after a failed migrate, is a ceiling-bypass bug. The parser must not use a broad exclusion that hides the migrate step. |
| **S4.6 Closure gates (open)** | A5/A6, A11 | The closure-gate tests are intentionally not authored as Green here; they are recorded as open with the named missing evidence (§0.3). Refutation: a plan/registry note that claims S4 is `[x]` complete while these gates are open is a false claim. |

## 3. Test surfaces: artifact vs live behavior

| Test file | Kind | Sub-tier | Required proof |
|---|---|---|---|
| `packages/db/src/__tests__/deploy-gate-contract.test.ts` | Artifact (cloudbuild parse) | S4.1, S4.5 | Parse `cloudbuild.yaml` steps; assert migrate-before-deploy, doctor-before-traffic, `--no-traffic`, active mode + non-empty approver, `0049` required-migration ceiling, `MIGRATION_CEILING_TAG` in the migrate step, no `allowFailure:true`. |
| `packages/domain/src/__tests__/pr-evaluation-release.test.ts` | Live behavior (pure function) | S4.1, S4.2, S4.3 | Execute `resolvePrEvaluationRuntimeRollout`, `assessPrEvaluationRelease`, `detectPrEvaluationModelDrift`, `decidePrEvaluationRollout`, `isPrEvaluationCanarySelected` against env-var and fixture inputs. Prove active-without-approval downgrades to shadow; canary selection is deterministic and bounded 1-100; drift reasons are named; eligible requires all thresholds. |
| `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts` | Artifact (route + scheduler + cloudbuild) | S4.1 | Assert the internal review-worker-tick route exists, uses `REVIEW_WORKER_TICK_TOKEN` bearer auth, binds the token from Secret Manager, deploys `CODECAMP_PR_REVIEW_ROLLOUT_MODE=active` + `CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release`, and checks in the two-minute UTC scheduler. |
| `packages/db/src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts` | Artifact + live behavior (mocked PG) | S4.5 | Assert `cloudbuild.yaml` carries `MIGRATION_CEILING_TAG=0049...`; `migrate.ts` forwards `migrationCeilingTag`; `resolveMigrationCeiling` rejects a successor migration via the mocked migration fixture. |
| `packages/db/src/__tests__/migration-ceiling-adversarial.test.ts` (Red, if gap exists) | Live behavior (mocked PG) | S4.5 | Exercise `resolveMigrationCeiling` against empty, whitespace, unknown, duplicated, and successor-bearing journal fixtures. Each must throw a named error. (If the existing `codecamp-0049-ledger-gap-deploy-contract.test.ts` already covers all four adversarial cases, this is a no-op reference; if not, Mid-Red authors the gap.) |
| Advisory-scope refutation suite (S2/S3, referenced not duplicated) | Live behavior | S4.3 | The S2/S3 tests already prove GitHub comments are advisory (not merge checks), one PR does not satisfy permanent mastery, and shadow cannot mutate learner state. S4.3 references these; it does not re-author them. |

### 3.1 Artifact/documentation tests vs live behavior tests

- **Artifact tests** read checked-in files (`cloudbuild.yaml`, the scheduler
  script, the route source) and assert structural properties. They prove the
  approval is *checked in* and *revision-bound*. They do not prove the runtime
  honors the config at execution time. A string-contains check on
  `cloudbuild.yaml` is an artifact test; it is necessary but not sufficient.
- **Live behavior tests** execute the pure runtime policy functions
  (`resolvePrEvaluationRuntimeRollout`, `decidePrEvaluationRollout`,
  `resolveMigrationCeiling`) against controlled inputs (env-var maps, mocked
  migration journals). They prove the runtime *honors* the approval contract
  and *rejects* fabricated markers. These are the falsifiable proof.
- A phase gate requires **both**: the artifact test proves the config is
  checked in at the reviewed revision; the live behavior test proves the
  runtime enforces the fail-closed policy. Neither alone satisfies S4.1.

## 4. Fixtures, mocks, and live-behavior proof expectations

### 4.1 Fixtures

- **Frozen PR evaluation fixtures** (`prEvaluationFixtureSchema`): each fixture
  requires `id`, `fixtureSetVersion`, `contentDigest` (64-hex SHA-256),
  `approval` (labelledBy/labelledAt/approvedBy/approvedAt/approvalReference),
  `expectedDisposition` (`pass`|`revise`), and `expectedObjectiveIds` (min 1).
  The implementation enforces governance but **does not claim local test
  fixtures are a production human-labelled dataset**. The closure gate (S4.5)
  for real human-labelled fixtures remains open.
- **Candidate results** (`prEvaluationFixtureResultSchema`): `fixtureId`,
  `schemaValid`, `disposition`, `objectiveIds`, `latencyMs` (finite, >=0),
  `totalTokens` (int, >=0).
- **Release policy** (`prEvaluationReleasePolicySchema`): bounded numeric
  thresholds (`minimumSchemaCompliance` 0-1, `maximumFalseApprovals` int >=0,
  `maximumAverageLatencyMs` finite >0, etc.).

### 4.2 Mocks

- The migration-ceiling tests mock `postgres` and `readPostgresMigrationFiles`
  via `vi.hoisted` to inject controlled journal fixtures (terminal, successor,
  duplicate, unknown). No real PostgreSQL is required for the ceiling
  adversarial cases; the pure `resolveMigrationCeiling` function is the unit.
- The runtime-rollout tests inject env-var maps directly into
  `resolvePrEvaluationRuntimeRollout`; no process.env mutation is needed.
- The deploy-gate and worker-deployment tests read real checked-in files; no
  mocks. They are artifact tests.

### 4.3 Live-behavior proof expectations

- `resolvePrEvaluationRuntimeRollout({CODECAMP_PR_REVIEW_ROLLOUT_MODE:"active"})`
  (no `RELEASE_APPROVED_BY`) -> `{mode:"shadow", runModel:true,
  mayPublishFeedback:false, approvedBy:null, approvalRequired:true}`.
- `resolvePrEvaluationRuntimeRollout({CODECAMP_PR_REVIEW_ROLLOUT_MODE:"active",
  CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY:"codecamp-ops-release"})` ->
  `{mode:"active", runModel:true, mayPublishFeedback:true,
  approvedBy:"codecamp-ops-release", approvalRequired:false}`.
- `resolvePrEvaluationRuntimeRollout({CODECAMP_PR_REVIEW_ROLLOUT_MODE:"canary"})`
  (no approver) -> downgraded to `shadow` with `approvalRequired:true`.
- `resolvePrEvaluationRuntimeRollout({CODECAMP_PR_REVIEW_ROLLOUT_MODE:"bogus"})`
  -> Zod `throw`s (unknown enum value).
- `decidePrEvaluationRollout({mode:"shadow", report:<any>, approvedBy:null})` ->
  `{allowLearnerMutation:false, reasons:["NON_MUTATING_ROLLOUT_MODE"]}`.
- `decidePrEvaluationRollout({mode:"active", report:{eligible:false,...},
  approvedBy:"x"})` -> `{mode:"fallback", allowLearnerMutation:false,
  reasons:["RELEASE_REPORT_INELIGIBLE",...]}`.
- `resolveMigrationCeiling(migrations, "0049_...")` where `0049` is terminal ->
  returns `migrations.slice(0, idx+1)`.
- `resolveMigrationCeiling(migrations, "0049_...")` where a `0050` successor
  exists -> throws `not a terminal journal prefix; successor "0050_..."`.
- `resolveMigrationCeiling(migrations, "")` -> throws `non-empty`.
- `resolveMigrationCeiling(migrations, "9999_unknown")` -> throws `not in the
  checked-in journal`.

## 5. Exact Red and Green commands per sub-tier

### S4.1 - Release-approval binding (bounded PO approval)

**Red command** (targeted; if any assertion is absent the suite is Red):

```bash
CI=true pnpm --filter @reading-advantage/db --fail-if-no-match exec vitest run \
  src/__tests__/deploy-gate-contract.test.ts
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts
CI=true pnpm --filter codecamp-advantage --fail-if-no-match exec vitest run \
  lib/__tests__/review-worker-deployment-contract.test.ts
```

**Green gate:** the three commands above exit 0; the deploy-gate test asserts
`CODECAMP_PR_REVIEW_ROLLOUT_MODE=active` AND
`CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release` exactly; the
runtime test asserts active-without-approval downgrades to shadow; the worker
test asserts the route, token, and scheduler config.

**Closeout gate:** `git show HEAD:apps/codecamp-advantage/cloudbuild.yaml`
still contains the approved `(mode, approver)` pair (revision-bound proof);
no later commit weakened, blanked, or removed the approver marker.

### S4.2 - Calibration harness and drift

**Red command:**

```bash
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts -t "assessPrEvaluationRelease"
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts -t "detectPrEvaluationModelDrift"
```

**Green gate:** `assessPrEvaluationRelease` returns `eligible:false` with named
failure codes for each exceeded threshold; `detectPrEvaluationModelDrift`
returns `drifted:true` with named reasons. A vacuous `eligible:true` on an
ineligible candidate is a Red.

**Closeout gate:** the frozen-fixture governance schema is enforced
(`fixtureSetVersion`, `contentDigest`, `approval` required); the closure gate
for real human-labelled production fixtures remains open (S4.5).

### S4.3 - Rollout transition safety

**Red command:**

```bash
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts -t "resolvePrEvaluationRuntimeRollout"
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts -t "decidePrEvaluationRollout"
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/pr-evaluation-release.test.ts -t "isPrEvaluationCanarySelected"
```

**Green gate:** shadow returns `mayPublishFeedback:false` and
`allowLearnerMutation:false`; active-without-approval downgrades to shadow;
canary selection is deterministic and bounded 1-100; invalid percent throws.

**Closeout gate:** the S2/S3 advisory-scope suites (GitHub comment advisory,
one-PR-no-permanent-mastery, shadow-no-mutation) remain Green at HEAD.

### S4.4 - Dispute and human override

**Red command:**

```bash
CI=true pnpm --filter @reading-advantage/domain --fail-if-no-match exec vitest run \
  src/__tests__/codecamp.test.ts -t "correction"
```

**Green gate:** an admin correction appends to the audit log with the original
attempt ID, corrected disposition, and reason; it does not edit the immutable
attempt and does not auto-mutate mastery.

**Closeout gate:** the intern admin page exposes only safe provenance and prior
corrections (no prompts, reasoning, or trusted context).

### S4.5 - Migration-ceiling adversarial (linked hotfix)

**Red command:**

```bash
CI=true pnpm --filter @reading-advantage/db --fail-if-no-match exec vitest run \
  src/__tests__/codecamp-0049-ledger-gap-deploy-contract.test.ts \
  src/__tests__/deploy-gate-contract.test.ts
```

**Green gate:** `resolveMigrationCeiling` rejects empty, whitespace, unknown,
duplicated, and successor-bearing ceiling tags; `cloudbuild.yaml` carries
`MIGRATION_CEILING_TAG=0049_codecamp_exercise_quiz_repair` in the migrate step;
the migrate step runs before `deploy-cloudrun`; the deploy step cannot run if
migrate fails (no `allowFailure:true` on doctor).

**Closeout gate:** a successor migration added to the journal is blocked by the
ceiling during this deploy; the active rollout in the deploy step does not
bypass the ceiling (they are in separate steps; migrate is a precondition).

### S4.6 - Closure gates (intentionally open)

**Red command:** none authored. These gates are recorded as open per §0.3.
Authoring a Green closure test before the human evidence exists would be A5
(false claim).

**Green gate:** not applicable until the human-labelled fixtures, credentialed
GitHub Checks acceptance, browser acceptance, and graph/doctor gates are
completed in separate sessions.

**Closeout gate:** the plan/registry must not mark S4 `[x]` until all six
gates in §0.3 are green with recorded evidence.

## 6. Architecture guardrails and changed-contract risks

- **Rollout config is production config.** This strategy does not edit
  `cloudbuild.yaml`, the scheduler script, the route, or any runtime policy
  source. The bounded approval revalidates the checked-in artifacts; it does
  not change them. Any change to `CODECAMP_PR_REVIEW_ROLLOUT_MODE` or
  `CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY` requires a new PO approval and a
  new strategy revision.
- **Advisory-scope invariant.** The active rollout publishes advisory PR
  feedback. It does not configure a required GitHub merge check, does not
  claim human authority, and does not auto-mutate mastery. The
  `allowLearnerMutation:true` return from `decidePrEvaluationRollout` means
  the rollout *may* publish learner-visible feedback; it does not mean one
  approval satisfies permanent mastery (the S3 multi-variant/delayed-retention
  contract governs that separately).
- **Migration-ceiling coexistence.** The active rollout (deploy step) and the
  migration ceiling (migrate step) coexist in `cloudbuild.yaml`. They do not
  conflict because they govern different concerns. The ceiling must not be
  removed or weakened to accelerate the rollout; the rollout must not be
  weakened to accommodate the ceiling. A change to either is a changed-contract
  risk requiring revalidation of both S4.1 and S4.5.
- **Provider-routing invariant.** PR review uses `~x-ai/grok-latest` via
  OpenRouter; tutor uses `xiaomi/mimo-v2.5`. The active rollout does not
  change model routing. A drift in the resolved alias must trigger
  `detectPrEvaluationModelDrift` and require re-approval (S4.2).
- **No worktree divergence (A16).** This strategy is authored in the single
  shared master checkout. `git worktree list` must show exactly one worktree.
- **No fabricated human evidence.** The PO decision is a real session event on
  2026-08-11. The strategy records it as a fact. It does not fabricate a
  human signature, a fixture label, or a browser-acceptance screenshot. The
  closure gates in §0.3 remain open precisely because that human evidence does
  not yet exist for the S4 closure scope.

## 7. Intentionally-red aggregate-suite handling

The aggregate `pnpm turbo run test` suite has known pre-existing failures that
are **not caused by S4** and must not block the bounded approval:

- **Webhooks suite**: 2 failures from `measure/tech-debt.md` (53 lines) and
  `measure/lessons-learned.md` (54 lines) exceeding their 51-line caps
  (pre-existing, unrelated to S4).
- **Standalone DB type check**: blocked by an unrelated `rootDir` error from
  `codecamp-users-seed.ts` importing the auth package (pre-existing).
- **Primary-advantage**: 49 pre-existing ESLint errors (pre-existing, unrelated
  track).
- **Mastery-runtime-compat / storage / backend / accounts dirty files**: the
  working tree has unrelated dirty files from the Finance/Identity/Accounts
  work in progress. These are preserved and must not be staged by this
  strategy commit.

The bounded-approval Green gate is the **focused** commands in §5, not the
aggregate. The aggregate suite's pre-existing reds are labeled and excluded
from the S4 acceptance signal. If a future change turns a focused S4 command
red, that is a real S4 failure and must not be hidden behind the
"pre-existing" label (A5 defense).

## 8. Risk classification per sub-tier

| Sub-tier | Risk | Why |
|----------|------|-----|
| S4.1 Release-approval binding | **critical** | The approval marker is the load-bearing defense against an unapproved active rollout mutating learner feedback. A1-style substring matching or A4 vacuous-pass here would let a blank approver ship active mode. |
| S4.2 Calibration harness and drift | **high** | Drift detection gates model-alias changes. A3-style digit-only thresholds or A4 vacuous eligibility would let a degraded model pass. |
| S4.3 Rollout transition safety | **high** | Shadow/canary/active transition must not duplicate comments, lose queued jobs, or mutate from shadow. An advisory-scope violation here is a learner-trust failure. |
| S4.4 Dispute and human override | **medium** | Append-only audit correction. Failure is a history-edit integrity issue but affects a smaller surface (disputed evaluations only). |
| S4.5 Migration-ceiling adversarial | **high** | The ceiling prevents an unreviewed successor migration from applying during deploy. A7-style broad-filter hiding the migrate step, or a ceiling that accepts a successor, is a production-data-safety risk. |
| S4.6 Closure gates (open) | **medium** | These are open gates, not failing tests. The risk is A5/A6 overstatement (claiming S4 closed prematurely), not a code defect. |

## 9. Review applicability

| Subagent / review track | Applicable to Phase S4 | Reason |
|---|---|---|
| Security review (review-b-security) | **YES - required** | S4.1 binds an active rollout approval marker to production config; S4.5 enforces a migration ceiling. Both are security-relevant: a fabricated marker or a bypassed ceiling is a production-safety failure. The review must inspect `cloudbuild.yaml`, the deploy-gate test, the runtime policy, and the migration-ceiling source. |
| UX/API review (review-c-ux-api) | **YES - required** | The active rollout publishes advisory PR feedback to GitHub and learner-visible review status. The review must verify the advisory-scope limits (no merge check, no human-authority claim, no auto-mastery) and that the runtime policy's `mayPublishFeedback` / `allowLearnerMutation` contract is transport-independent and stable. |
| Adversarial testing | **YES - required** | S4.1 fabricated-marker rejection, S4.2 false-approval/false-rejection and injection resistance, S4.3 shadow-no-mutation, and S4.5 ceiling-bypass (successor, empty, duplicate, unknown) are all named refutations that must be exercised as adversarial fixtures, not source-text claims. |
| Browser review (ux-browser-review) | **NO for the bounded approval; YES for S4 closure** | The bounded approval revalidates config and runtime policy only; no browser workflow is exercised. The S4 closure gate (§0.3 item 4) requires credentialed Codecamp SSO browser acceptance of the full student/teacher PR flow; that remains open and is not satisfied by this strategy. |

## 10. `phase_base_sha` capture point

The orchestrator must capture the immutable `phase_base_sha` for Phase S4
**after this strategy commit lands** and **before any new Red commit is
authored for an S4 sub-tier**. Concretely:

1. Commit this strategy as
   `docs(measure): refresh S4 release-approval test strategy (track_id: codecamp_pr_mastery_evaluation_20260710)`
   on the master branch (the role-owned change).
2. `git rev-parse HEAD` immediately after the commit succeeds. That SHA is the
   truthful S4 base for any subsequent S4 Red cycle.
3. **Do not embed a SHA in this strategy that predicates the committed
   strategy.** The supplied pre-track anchor `60397049` is the historical
   phase base; the post-strategy-commit HEAD is the immutable base for future
   S4 work. The role must not speculate about a future SHA.

Until the strategy commit lands, the supplied immutable phase base remains
`60397049ed50838bab109bf25af0a1972ab2b05e` and the reviewed HEAD remains
`46f97a54d69c37f931c72069ff063d95e1525c41`. After this strategy commit lands,
the orchestrator must capture the post-strategy HEAD as the truthful
`phase_base_sha` for any subsequent S4 Red cycle.

## 11. Phase S4 closure declaration

Phase S4 is **not closed** at this strategy revision. The bounded PO approval
of the active rollout closes only the release-approval binding (S4.1) and
revalidates the already-shipped runtime policy (S4.2-S4.4) and migration
ceiling (S4.5). The phase closes only after all of the following are true at
HEAD:

- The focused S4.1-S4.5 commands in §5 exit 0 with non-zero test/assertion
  counts.
- The six open closure gates in §0.3 are green with recorded evidence:
  human-labelled fixtures, frozen/live evaluation, credentialed GitHub Checks,
  end-to-end browser acceptance, graph/generate/doctor, and curriculum review.
- The plan/registry does not claim S4 is `[x]` complete while any gate in §0.3
  is open (A5/A6 defense).
- The S4 task markers in `plan.md` use `[~]` (in-progress) or `[x]` (complete
  with evidence), not legacy `[ ]` (A8 defense); the plan-update role converts
  any remaining `[ ]` before supervisor execution.

Until then, the S4 closeout tasks remain `[ ]`/`[~]`, the S4 story in
`metadata.json` must not flip to `"complete"`, and `measure/tracks.md` must
not mark this track as archived. The bounded approval is recorded as a
real 2026-08-11 PO session event approving the active rollout's advisory PR
feedback scope only; it is not a closure signature.
