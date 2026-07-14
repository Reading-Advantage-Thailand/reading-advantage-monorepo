# Test Strategy: APK Independent Source Denominator Inventory

## Boundary

Phase 0 freezes only the inputs, methods, roles, budgets, schemas, and gates for
future discovery. It does not enumerate a game, source file, scene, state, asset,
route, historical fact, or product requirement. A structural pass proves this freeze
is internally bound; it never establishes denominator correctness (A5).

`phase0-input-freeze.json` is the sole Phase-0 input contract. Its baseline is
`23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`; only committed blobs at that revision,
or its reachable ancestors for historical work, may be used. Uncommitted bytes and
the failed ontology track are excluded. The ontology tree is quarantined at baseline
tree `f35df55e9943b4da3ece9f1dbbf8dd75232f7c20` and may be cited only as negative
failure evidence, never as a factual source.

## Phase 0 falsification

The focused test is
`measure.tests.test_apk_source_denominator_inventory_phase0`.

- **RED command (before the Phase-0 freeze artifact/test exists):**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0`
  It exits nonzero because the module and required freeze artifacts do not exist.
- **GREEN command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0`
  It exits zero only when the predecessor manifest is byte-bound at the supplied
  baseline; the failed-tree quarantine, committed-only source boundary, numeric
  budgets, stop-loss values, required isolated roles, and all expected output paths/
  schema labels are present. Mutating a bound hash, replacing a numeric ceiling with
  text, omitting an incompatible-role pair, or placing a quarantined path in roots is
  a failure.
- **Phase-0 project gate:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -v -s measure/tests/evidence_integrity_gates -p 'test_*.py' && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0 && bash tests/orchestrator_supervisor_invariants.sh && bash tests/orchestrator_review_execution_truthfulness.sh && bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_detector_syntax.sh && bash tests/orchestrator_role_receipt_integrity.sh && bash measure/doctor.sh`
- **Orchestrator status:**
  `python3 ~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py status --repo .`

The Mid-Red role must preserve the freeze test and add only denominator-contract
counterexamples. No generated report, fixture, role plan, or passing test may be
represented as discovered source truth (A4/A5/A6).

## Phase 1 mechanical-discovery contracts

The focused test is `measure.tests.test_apk_source_denominator_inventory_phase1`.
It uses the frozen committed source revision
`23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`, not worktree bytes, to resolve every
claimed path, blob, and inclusive line-range hash. The test contract itself is pinned
to authoring baseline `6c860c5a49144beaf489a938d992425259765a1c` in
`denominator-contract-test-report.json`; that report is a red contract, not discovery
evidence or an accepted denominator.

- **RED command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase1`
  It exits nonzero at this stage with `AssertionError: Missing Phase-1 denominator
  artifact: measure/tracks/apk_source_denominator_inventory_20260712/source-denominator.json`.
  Missing denominator artifacts are the expected failure; import, JSON, Git, or Python
  syntax errors are not an acceptable Red result.
- **GREEN command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase1`
  It exits zero only when source identity/file/route/copy/graph records, identity-ledger
  routes, real source-evidenced scene/state/transition records, exhaustive candidate
  asset/audio/data hashes and basic format metadata, identical-hash groups, reachable
  historical locators, and quarantine rejection fixtures are present. Every factual
  locator must resolve to the frozen baseline (or a reachable ancestor for history),
  match its blob and inclusive line-range SHA-256 hashes, and avoid the failed-track
  tree. The suite rejects synthetic fallback scene/state IDs and forbidden mechanic,
  capability, responsive, suitability, semantic-role, or product-disposition fields.
- **Static syntax command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase1.py`
- **Handoff:** The discovery-auditor must author the missing denominator artifacts and
  rerun the exact GREEN command. This remains a Phase-1 in-progress contract; it does
  not mark Phase 1 complete or authorize acceptance.

## Required future artifact schemas

The expected paths and schema-version labels are enumerated in
`phase0-input-freeze.json.expected_artifacts`. Future artifacts must record exact
revision/path/range hashes and discovery method; they must not contain semantic
capability, responsive, asset-suitability, or product-disposition conclusions.
Role receipts are required at the listed path pattern and must be tool-attested.
The role plan is intentionally not a receipt. Missing receipts, inherited reviewer
context, role overlap, unmeasured usage, or a breached ceiling block advancement.

## Acceptance and ownership

All five mandatory roles apply. Their output ownership, pairwise isolation, and
fresh-review requirement are frozen in `phase0-role-ownership-manifest.json`. Each
batch is at most three games; one unsupported claim or denominator mismatch stops the
batch; two failed fix/review cycles block the track; unresolved Critical, High, or
Medium findings block later phases. Resource ceilings are numeric and role-specific in
the input freeze; a ceiling change needs prior product-owner approval and revalidation.

The product-owner verification task remains `[b] deferred:product-owner`. No candidate
or accepted denominator manifest exists after Phase 0, and no product-owner approval is
requested by this strategy.

## Phase 2 independent-human-discovery contracts

The focused test is `measure.tests.test_apk_source_denominator_inventory_phase2`.
It consumes Phase-1's committed `game-identity-ledger.json`,
`historical-source-denominator.json`, and `denominator-discrepancies.json` solely as
the exhaustive denominator to review; it does not use them as human evidence. Human
claims must independently resolve their own committed current-source locators at
`23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`, with exact blob and inclusive
line-range SHA-256 values. Historical locators must be exact Phase-1 locators at
reachable ancestors of that baseline.

- **RED command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase2`
  It exits nonzero until the Phase-2 human-discovery artifacts exist. At this Red
  handoff, every failure must be `AssertionError: Missing Phase-2 human-discovery
  artifact: measure/tracks/apk_source_denominator_inventory_20260712/independent-human-discovery.json`.
  Existing Phase-1 ledgers, imports, JSON, Git, and Python syntax are not an
  acceptable source of Red failure.
- **GREEN command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase2`
  It exits zero only when all Phase-1 identities appear exactly once in explicit
  accepted batches of one through three, all have raw current-source claims with
  exact locators and the `human-raw-source-review` method, and Reading and Primary
  observations exist separately for every identity. The suite requires exact
  one-for-one coverage of every Phase-1 historical/deleted locator, an independent
  evidence-collector receipt, and fail-closed comparison records for every Phase-1
  identity and mechanical discrepancy observation. It rejects sampled coverage,
  merged Reading/Primary records, unreachable history, unpinned evidence, unresolved
  discrepancies, and semantic/product interpretation fields.
- **Static syntax command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase2.py`
- **Handoff:** The discovery-auditor and evidence-collector must independently author
  the missing Phase-2 artifacts and their separate receipt, then rerun the exact
  GREEN command. This contract neither accepts a denominator nor marks Phase 2
  complete.

## Phase 3 reconciliation contracts

The focused test is `measure.tests.test_apk_source_denominator_inventory_phase3`.
It compares the committed Phase-1 mechanical records with the separate Phase-2 human
records and requires a new non-consumable `phase3-reconciliation.json`; it does not
repair, merge, rename, or otherwise author a denominator fact. Exact source locators
continue to resolve only from `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` (or a
reachable ancestor for historical work).

- **RED command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase3`
  It exits nonzero until `phase3-reconciliation.json` exists. At this handoff, all
  failures must be `AssertionError: Missing Phase-3 reconciliation artifact:
  measure/tracks/apk_source_denominator_inventory_20260712/phase3-reconciliation.json`.
  Existing Phase-1 and Phase-2 artifacts, imports, JSON, Git, and Python syntax are
  not an acceptable source of Red failure.
- **GREEN command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase3`
  It exits zero only when every mechanical identity and file, scene/state/phase/
  overlay/transition/terminal/presentation surface, asset candidate, identical-hash
  group, duplicate/drift observation, and historical/deleted/withdrawn record has an
  explicit raw-evidence comparison result. The test derives the replacement program's
  exact 29-identity expectation from the committed program blob, checks that expectation
  against recorded mechanical and human counts, and blocks rather than silently treating
  a smaller authored denominator as complete. It validates every Phase-3 locator's
  revision, blob hash, and inclusive range hash; rejects conclusion or interpretation
  fields; rejects empty coverage collections; and requires every unresolved source to
  appear exactly once in a blocking record. A truthful `reconciliation-blocked` result
  is permitted when source evidence is incomplete; candidate or accepted status is not.
- **Static syntax command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase3.py`
- **Prior-contract verification:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase1 measure.tests.test_apk_source_denominator_inventory_phase2`
- **Handoff:** The requirements-mapper, discovery-auditor, and evidence-collector must
  publish an exhaustive reconciliation or a fail-closed blocked result with raw source
  evidence, then rerun the exact GREEN command. Phase 3 remains in progress until all
  blocking source gaps are independently reviewed; this contract never accepts a
  denominator or changes the product-owner gate.

## Phase 4 full independent-acceptance contracts

The focused test is `measure.tests.test_apk_source_denominator_inventory_phase4`.
It starts with the absent `independent-review.json` as its sole expected RED cause;
the authored RED report is contract-only and no candidate, owner approval, accepted
manifest, partition, or completion assertion is authored by this role. The test
independently resolves every reviewed locator against the frozen baseline or a
reachable ancestor, recalculates blob and inclusive-range SHA-256 values, and compares
the complete Phase-3 identity, file, source-record, surface, asset, identical-hash
group, copy, and historical/discrepancy result sets rather than trusting summary counts.

- **RED command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase4`
  It exits nonzero until the independent-review output exists. At this handoff, every
  failure must be `AssertionError: Missing Phase-4 independent-acceptance artifact:
  measure/tracks/apk_source_denominator_inventory_20260712/independent-review.json`.
  Import, JSON, Git, syntax, historical-artifact, candidate, acceptance, or plan-marker
  failures are not acceptable RED causes.
- **GREEN command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase4`
  It exits zero only after a fresh `fork_turns="none"` adversarial reviewer publishes
  a full reproducible Phase-3 rerun with zero unresolved Critical, High, and Medium
  findings; exact locator/reachability/hash and all denominator partitions are
  revalidated; its receipt records measured integer resource use under every frozen
  ceiling and zero stop-loss events; and non-consumable candidate denominator and
  29-identity partition manifests bind their exact review/reconciliation bytes. Before
  product-owner approval, accepted manifests must be absent. After approval, current
  product-owner authorization must bind the exact candidate denominator/candidate partition/review/predecessor-gate
  hashes before accepted denominator and partition manifests may exist. Terminal
  metadata/plan/registry state then requires no `[~]`, `[b]`, or legacy `[ ]` markers
  and a resolvable commit reference on every `[x]` task.
- **Static syntax command:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase4.py`
- **Prior-contract verification:**
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0 measure.tests.test_apk_source_denominator_inventory_phase1 measure.tests.test_apk_source_denominator_inventory_phase2 measure.tests.test_apk_source_denominator_inventory_phase3`
- **Handoff:** The adversarial-reviewer owns the fresh review, rerun evidence, and
  measured receipt. The product owner alone may provide the current exact-hash approval
  after that review; accepted manifests are rendered only afterwards. This RED contract
  does not accept the denominator, mutate the phase plan, or claim owner approval.

### Phase-4 execution gates and falsification

**Current entry state (baseline `d1e9d034dad90b0b870ed0edb25bb20b2addf695`):** the
focused Phase-4 command is intentionally red solely because
`independent-review.json` is absent (all ten cases fail at that same missing-artifact
assertion). This is a valid Red result, not review evidence. The preceding combined
Phase 0–3 run is currently red in the dirty worktree (including Phase-2 denominator
set comparisons); Phase-4 work must not rationalize, overwrite, or mask those
failures. Its first admission check is that the committed predecessor contracts are
green again. The reviewer reports a blocking finding or stops if that check cannot be
obtained.

| Gate | Exact command / evidence | Pass condition and falsification |
| --- | --- | --- |
| Admission | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0 measure.tests.test_apk_source_denominator_inventory_phase1 measure.tests.test_apk_source_denominator_inventory_phase2 measure.tests.test_apk_source_denominator_inventory_phase3` | All prior tests exit 0 against their committed inputs. Any failed prior assertion, timeout, or worktree-derived factual input is a block, not a Phase-4 fix opportunity. |
| Red | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase4` | Before reviewer output, every failure is the explicit missing `independent-review.json` assertion. A syntax/import failure, a candidate/owner artifact, or a different failure cause invalidates Red. |
| Reviewer Green (pre-owner) | `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase4.py && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase4` | A fresh `fork_turns="none"` adversarial-reviewer receipt, independently regenerated Phase-3 bytes, all exact sets/locators/hashes, zero **numeric** CHM counts, and exact non-consumable candidate/partition manifests pass. `product-owner-acceptance.json` and both accepted manifests remain absent. Any stale hash, failed generator, missing partition member, nonzero CHM count, receipt-budget breach, or accepted output before owner approval fails. |
| Phase closeout (owner-gated) | Run the Reviewer Green command, then `bash tests/orchestrator_supervisor_invariants.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_role_receipt_integrity.sh && bash tests/orchestrator_detector_syntax.sh && bash measure/doctor.sh`. Retain the command output with the owner event. | Only a current product-owner authorization event bound to exact candidate, partition, review, and predecessor-gate hashes may make the Phase-4 test validate accepted manifests and terminal markers. Any missing/replayed/agent-authored authorization, changed bound bytes, unresolved global gate, legacy marker, or missing commit reference blocks closeout. This strategy neither requests nor records that approval. |

### Phase-4 fixtures, proof types, and architecture guardrails

- **Fixtures/refutations:** Use temporary copies or deliberately mutated artifacts,
  never the real candidate as a test oracle: alter one locator range/blob hash; cite a
  non-ancestor revision; remove or duplicate an identity/asset/hash-group/copy/history
  record; set a CHM finding to `high`; set a receipt usage value to a string, boolean,
  negative number, or over-ceiling integer; replace `fork_turns` with an inherited
  context; mark a candidate consumable; add an accepted manifest before owner approval;
  or bind the owner event to an old candidate hash. Each mutation must make the focused
  contract fail at the corresponding assertion.
- **Live-source proof, not a mock:** the reviewer must invoke the Phase-3 generator in
  a temporary output path and compare its SHA-256 to the committed reconciliation,
  resolve every source locator via `git show`, and verify history with
  `git merge-base --is-ancestor`. Fixture/mocked JSON may prove rejection paths only;
  it cannot prove a denominator, reviewer isolation, or owner approval. Browser/gameplay
  behavior is explicitly out of scope: this inventory phase tests source evidence and
  artifact provenance, not a runnable game route or UX.
- **Changed-contract risks:** treat the frozen baseline, Phase-3 schema/result sets,
  resource-ceiling keys, receipt schema, candidate status flags, 29-label program
  partition order, and owner-hash binding as contracts. A source, generator, schema,
  or candidate-byte change requires a new reviewer rerun and receipt; it must never be
  repaired by editing summary counts or reusing a prior approval. No role may review
  its own denominator, evidence, mapping, or truth-test output; the strategy role only
  specifies these checks and is not the reviewer.

### Phase-4 anti-pattern coverage

| Anti-pattern | Required defense and falsification condition |
| --- | --- |
| A1 | Run `orchestrator_supervisor_invariants.sh`; task state is read from structured `[x]`/`[b] deferred:product-owner` markers, never prose containing “deferred”. A free-text mutation must not make an incomplete task disappear. |
| A2 | Accepted outputs are impossible without a current product-owner event bound to all four exact hashes. A candidate-only or agent-written “approval” fails the owner-authorization assertion. |
| A3 | Receipt usage and stop-loss fields are parsed as labeled JSON integers, with exact key sets and ceiling comparisons—not a digit regex. A date/string/boolean or unlabeled digit fails. |
| A4 | Green requires nonempty exact Phase-3 collections plus a completed independent rerun; no artifact, all-`[~]` reviewer work, or zero-work summary can pass. |
| A5 | `red-contract-authored`, `candidate-non-consumable`, and `accepted` are distinct assertions. Record a green/closeout claim only with the cited command exit 0 and required bytes; a passing structural report alone is refuted by the live-source rerun. |
| A6 | Keep `metadata.json` and `tracks.md` in progress until the owner-bound accepted manifests exist; the Phase-4 terminal-state test rejects an early completed/“accepted” registry claim. |
| A7 | Compare full keyed sets, exact hashes, and explicit severity values. Do not use broad keyword exclusions; a forbidden interpretation field or omitted record must remain visible and fail. |
| A8 | Run `orchestrator_marker_vocabulary.sh`; only `[x]`, `[~]`, and real `[b] deferred:product-owner` states are allowed before closeout, and no `[ ]`, `[~]`, or `[b]` survives terminal closeout. |
| A9 | Keep this active-track test rooted at `measure/tracks/<track>`; any later archive-aware validator must resolve active/archive paths rather than hard-code an obsolete active path. An archive move with a stale path is a validation failure. |
| A10 | Run `measure/doctor.sh` at closeout. No TypeScript structural change is authorized by this strategy, so graph/generated-facts updates are not substituted for evidence; if any such change is introduced, regenerate/update its required generated facts and rerun all gates. |
| A14/A15 | Treat detector exit 2 as a failure (never `|| true`), and rerun receipt-integrity validation after every reviewed fix. A non-executable detector or receipt hash that differs from current output blocks publication. |

The aggregate suite is intentionally red before the independent reviewer supplies its
outputs and remains blocked while a predecessor contract is red. Report those states
as **expected Red / blocked**, never as test failure remediation or product-owner
acceptance. Only the exact focused Green and closeout gates above may change that
classification.

## Reconciliation against current evidence (strategy retry)

This strategy is reissued to reconcile the contract with the **current state at
baseline `476835906509e2c550ed98e0d23e89c7326b7bdc`** so neither the contract nor
the closeout gate is weakened.

### Admission evidence (32/32 at the frozen predecessor gate)

- The committed combined Phase 0–3 admission gate at this revision is recorded as
  green in `phase3-green-test-report.json` (32 tests). The regenerated
  `phase3-reconciliation.json` deterministic SHA-256 is
  `cd72b34a77fce57c62a8976087fb029611a1c78429af7da485780aba5663d1d3`,
  `unresolved_sources == 0`, `reconciliation_status == "reconciliation-complete"`,
  and `reviewed_program_identities == 29` (17 current, 12 historical/withdrawn).
- The focused Phase 0, 1, 2, and 3 contracts each have a committed Green report and a
  non-consumable artifact set bound by SHA-256; none of them is replaced by an
  authored interpretation. The Phase 2 mechanical-record reviews cover the five paths
  added at `e14ab11e` and the scene/state restructure at `3384f558`, and the Phase-3
  generator re-pinned the Phase-1 baseline to `3384f558` so Phase-2 and Phase-3 read
  the same Phase-1 denominator. Re-running any predecessor contract that drifts from
  its committed inputs invalidates the admission gate and blocks Phase 4.

### Stale fail / fail / blocked review artifacts

- `review-a-correctness.json` (status `fail`), `review-b-security.json` (status
  `fail`), and `review-c-contracts.json` (status `blocked`) pre-date the current
  `47683590` HEAD and several Phase-1 / Phase-3 commits. They remain on disk as
  historical evidence and as **input** to the next Phase-4 reviewer rerun; they are
  not accepted review results, do not satisfy `independent-review.json`, and must not
  be cited as the source of any acceptance, candidate, owner, or closeout claim.
- The Phase-4 contract continues to reject a review whose findings include any
  severity in `BLOCKING_SEVERITIES = {"critical", "high", "medium"}`; a rerun is
  required once the predecessor admission gate is green and a fresh `fork_turns=none`
  reviewer is dispatched.

### Canonical Measure role ordering vs. frozen five-role ownership

The canonical Measure orchestrator (`measure-orchestrator/SKILL.md` §Role Order)
registers **twelve** subagent types: `measure-strategy`, `measure-mid-red`,
`measure-jr-green`, `measure-review-a-correctness`, `measure-review-b-security`,
`measure-review-c-ux-api`, `measure-phase-acceptance`, `measure-adversarial-testing`,
`measure-ux-browser-review`, `measure-final-acceptance`, `measure-closeout`,
`measure-orchestrator-audit`. These are the **only** subagent types the orchestrator
will accept in `subagent_type`. They are canonical and must not be renamed,
replaced, or bypassed.

The track's `phase0-role-ownership-manifest.json` freezes **five track-local roles**
with pairwise isolation and `fork_turns="none"` provenance:
`discovery-auditor`, `evidence-collector`, `requirements-mapper`,
`truth-test-author`, `adversarial-reviewer`. These roles name **what the track
produces**, not which canonical subagent type authors them. They remain frozen and
their evidence is non-fabricable: a receipt claiming `adversarial-reviewer` must come
from a `fork_turns="none"` session with measured integer resource use under every
frozen ceiling, zero numeric stop-loss observations, and SHA-256-bound outputs; an
audit-only canonical role (`measure-review-a-correctness`, etc.) cannot satisfy
this contract because it writes only an audit result JSON and is not allowed to
commit, generate `independent-review.json`, or bind the candidate manifest hashes.

### Role-map problem and infrastructure blocker

The track's frozen `adversarial-reviewer` role has **no exact canonical-subagent
counterpart** that can author `independent-review.json`,
`role-receipts/adversarial-reviewer.json`, `candidate-denominator-manifest.json`,
and `candidate-partition-manifest.json` while satisfying the strict isolation,
provenance, and budget-measurement requirements above. The closest canonical role,
`measure-adversarial-testing`, is documented as **audit-only** and routes exposed
defects to Green rather than authoring acceptance artifacts.

This is a **precise infrastructure blocker**, not a contract weakness. Until either:
(a) a future Measure orchestrator revision registers a `measure-adversarial-reviewer`
subagent type capable of authoring Phase-4 reviewer artifacts with the required
isolation properties, or (b) the orchestrator's task tool is extended to allow a
delegated `fork_turns="none"` session bound to the track-local
`adversarial-reviewer` role, the Phase-4 reviewer cannot be dispatched as a
canonical subagent, the candidate manifests cannot be authored by a canonical
subagent, and the closeout gate cannot be satisfied.

The valid **delegated ownership** while the blocker stands is therefore:

1. **Predecessor contracts (Phase 0–3):** authored by the canonical
   `measure-mid-red` and `measure-jr-green` subagents, whose track-local role names
   (`truth-test-author`, `discovery-auditor`, `evidence-collector`,
   `requirements-mapper`) are recorded in each artifact's `role` / `task_id` field
   without weakening the frozen pairwise isolation. These roles continue to share
   the same SHA-256-bound outputs, frozen ceilings, and `fork_turns="none"`
   provenance required by `phase0-role-ownership-manifest.json`.
2. **Phase-4 review artifacts** (`independent-review.json`,
   `role-receipts/adversarial-reviewer.json`, candidate manifests): remain blocked.
   They are not authored by `measure-strategy`, by any predecessor canonical role, or
   by the orchestrator itself. They wait on the infrastructure unblock above. No
   strategy weakening (e.g., dropping `fork_turns="none"`, accepting an inherited
   reviewer context, accepting an all-`[~]` reviewer state, accepting an owner
   authorization without the four exact hash bindings) is authorized as a workaround.
3. **Phase-4 closeout artifacts** (`product-owner-acceptance.json`, accepted
   manifests, terminal metadata/plan/registry state): remain blocked on the same
   infrastructure unblock and on the product-owner authorization event bound to the
   exact candidate/partition/review/predecessor-gate hashes.

### Trusted-provenance constraints (re-asserted)

- All locator resolutions, blob and inclusive-range SHA-256 values, ancestor checks,
  and reachability checks continue to operate against the frozen baseline
  `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` and its reachable ancestors only; the
  worktree, failed-track tree, and uncommitted bytes are excluded.
- Receipts continue to record labeled-integer `actual_usage` per frozen ceiling and
  zero numeric stop-loss observations; `null`, boolean, string, date, negative, or
  over-ceiling values still fail the focused Phase-4 contract.
- `metadata.json.status`, `tracks.md` row, and `plan.md` task markers remain
  truthful: an early `status: "done"` or registry `completed` row while accepted
  manifests are absent is a Phase-4 falsification per anti-pattern A6.
- Phase-4 candidates and accepted manifests continue to be **non-consumable** until
  the exact four-hash product-owner event binds them; no Phase-4 reviewer
  pre-approval acceptance, no Green-owned reviewer output, and no agent-written
  approval is honored.

### Strategy role ownership on this retry

This strategy update is owned by `measure-strategy` and is **strategy-only**: it
re-asserts the existing frozen contract, reconciles it against current evidence,
names the role-map infrastructure blocker, and defines the valid delegated
ownership under the canonical role ordering. It does not author, mutate, or
approve any Phase-4 artifact; it does not mark any Phase-4 task `[x]`; it does not
request product-owner acceptance; and it does not advance any canonical role's
lifecycle past its current handoff. The canonical `measure-strategy` subagent is
the role that authors this update, which is exactly the contract role described
above.

The next legal subagent invocation after this strategy commit is the canonical
`measure-mid-red` (truth-test-author) or `measure-jr-green` (discovery-auditor /
evidence-collector / requirements-mapper) for predecessor remediation only — never
the `adversarial-reviewer` until the infrastructure unblock above is in place.
