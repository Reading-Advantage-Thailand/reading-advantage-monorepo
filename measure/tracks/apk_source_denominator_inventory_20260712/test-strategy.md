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
  schema labels are present. The test literal-equals the ordered-first-match source
  and asset classifiers, all suffixes, five roots, 29 program slugs, and the four-key
  history classifier. It also requires the task, root-coordinator, external product-
  owner, and receipt-directory output sets to be pairwise disjoint and exactly equal
  to the expected artifact set. Mutating any predicate datum or bound hash, replacing
  a numeric ceiling with text, omitting an incompatible-role pair, or placing a
  quarantined path in roots is a failure.
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
`denominator-contract-test-report.json` is a truth-test-author output. The isolated
adversarial reviewer owns only `independent-review.json` plus its own receipt under
`role-receipts/`. The root coordinator alone renders the candidate and accepted
denominator/partition manifests. `product-owner-acceptance.json` is external human
authority and cannot be authored by the coordinator or reviewer.

## Acceptance and ownership

All five mandatory roles apply. Their output ownership, pairwise isolation, and
fresh-review requirement are frozen in `phase0-role-ownership-manifest.json`. Each
batch is at most three games; one unsupported claim or denominator mismatch stops the
batch; two failed fix/review cycles block the track; unresolved Critical, High, or
Medium findings block later phases. Resource ceilings are numeric and role-specific in
the input freeze; a ceiling change needs prior product-owner approval and revalidation.

The product-owner verification task remains `[b] deferred:product-owner`. Phase 0
freezes the later lifecycle output contracts but does not publish or authorize them,
and no product-owner approval is requested by this strategy.

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
produces**, and the canonical Measure orchestrator **canonical subagent types** are
mapped to them under track-local ownership: `measure-mid-red` → `truth-test-author`,
`measure-jr-green` → `discovery-auditor` / `evidence-collector` /
`requirements-mapper` (one canonical subagent per role invocation),
`measure-adversarial-testing` → `adversarial-reviewer`. The five track-local roles
remain frozen and their evidence is non-fabricable: every receipt must come from a
`fork_turns="none"` isolated session with measured labeled-integer resource use
under every frozen ceiling, zero numeric stop-loss observations, and SHA-256-bound
outputs. Audit-only canonical roles (`measure-review-a-correctness`,
`measure-review-b-security`, `measure-review-c-ux-api`, `measure-phase-acceptance`,
`measure-final-acceptance`, `measure-ux-browser-review`) write only their supplied
audit result and route blockers to the owning role — they do not satisfy any of
the five track-local role ownerships. `measure-adversarial-testing` is **not** in
`CANNOT_COMMIT_ROLES` per
`~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py:41`,
and per the SKILL §Delegation "Red, Green, adversarial testing, orchestrator-audit
guard-test work, and closeout may edit within their explicit ownership," so it is
the only audit-class canonical role that may author and commit
`independent-review.json`, `role-receipts/adversarial-reviewer.json`,
`candidate-denominator-manifest.json`, and `candidate-partition-manifest.json`
when it is assigned the bounded track-local `adversarial-reviewer` ownership.

### Canonical role-to-ownership mapping and order

The track's frozen `adversarial-reviewer` role **does** have a canonical-subagent
counterpart: `measure-adversarial-testing`. Per `measure-orchestrator/SKILL.md`
§Delegation, "Red, Green, adversarial testing, orchestrator-audit guard-test work,
and closeout may edit within their explicit ownership." The
`CANNOT_COMMIT_ROLES` set in
`~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py:41`
is `{"review-a", "review-b", "review-c", "phase-acceptance", "ux-browser-review",
"final-acceptance"}`; `adversarial-testing` is not in that set, so it may
commit edits within its explicit ownership. The previously recorded claim that
"`measure-adversarial-testing` is documented as **audit-only** and routes exposed
defects to Green rather than authoring acceptance artifacts" was a
strategy-owned canonical-contract error introduced when the canonical
orchestrator audit-only class was over-generalized to `adversarial-testing`.

The canonical mapping and order for this track's Phase 4 (and any later reviewer
acceptance phase) is therefore:

1. **Predecessor contracts (Phase 0–3):** authored by canonical `measure-mid-red`
   and `measure-jr-green` subagents under the track-local ownership names
   `truth-test-author` (freeze contract and admission tests),
   `discovery-auditor` (mechanical denominator),
   `evidence-collector` (asset and historical denominator),
   `requirements-mapper` (reconciliation records and discrepancies). One
   canonical subagent is invoked per role; the track-local role name is recorded
   in each artifact's `role` / `task_id` / receipt `task_id` field. Frozen
   pairwise isolation, frozen ceilings, and `fork_turns="none"` provenance from
   `phase0-role-ownership-manifest.json` are preserved.
2. **Review A/B/C (audit-only, in parallel):** canonical
   `measure-review-a-correctness`, `measure-review-b-security`, and
   `measure-review-c-ux-api` after Jr commits Green work. They write only their
   supplied audit result JSON and route blockers to Green. Their prior
   `review-a`/`review-b`/`review-c` outputs on disk are stale and remain
   historical input to the next reviewer rerun.
3. **`measure-adversarial-testing` acting under explicit frozen
   `adversarial-reviewer` ownership:** this canonical subagent is the bounded
   track-local owner of `independent-review.json`,
   `role-receipts/adversarial-reviewer.json`,
   `candidate-denominator-manifest.json`, and
   `candidate-partition-manifest.json`. It may also re-generate Phase-3
   reconciliation bytes into a temporary output path, run the live contract
   tests against them, and compare the SHA-256 against the committed
   reconciliation. It is invoked with `fork_turns="none"` (or a retained raw
   export whose history starts with exactly the fresh review prompt), measured
   labeled-integer `actual_usage` per frozen ceiling, zero numeric stop-loss
   observations, frozen freshness, ancestor-only inputs, prompt/context hashes,
   output hashes, and no inherited author narrative. Defects found are routed to
   Green via adversarial feedback, then the affected gates are rerun. It is
   invoked once after the predecessor admission gate is green and after
   Green-rerouted Review-A/B/C remediation has landed; if it returns a blocking
   finding, Green remediates and `measure-adversarial-testing` reruns.
4. **`measure-phase-acceptance`:** invoked only after every required Review
   A/B/C, the `measure-adversarial-testing` reviewer rerun, and any UX/browser
   review (none applicable here) target the same final phase HEAD. It is
   audit-only, requires its supplied `--result-file`, and is not in the commit
   path.
5. **Product-owner exact-hash gate:** the product owner (human, external to
   the orchestrator) binds the exact candidate/partition/review/predecessor-gate
   hashes in `product-owner-acceptance.json` with a current
   authorization event. This step is not a canonical subagent; it is the
   non-substitutable authorization required to flip candidate manifests from
   non-consumable to accepted.
6. **`measure-final-acceptance`:** the pre-closeout audit-only role;
   requires every `phase-acceptance` result, the candidate hashes, the owner
   binding, and the global gates (`measure/doctor.sh`, `PROJECT_LINT`,
   `PROJECT_CHECKS`, `PROJECT_TESTS`) to exit 0. Audit-only; not in the
   commit path.
7. **`measure-closeout`:** the canonical closeout role moves
   `measure/tracks/<track>` to `measure/archive/<track>`, flips
   `metadata.json.status` to `done`, removes the active track row from
   `measure/tracks.md`, and writes the closeout manifest. Per the SKILL
   §Closeout Standard and the SKILL §Delegation closeout allowance, it is
   permitted to commit within its explicit ownership.

**Fabrication guards on the canonical-to-track-local mapping.** Mapping a
canonical subagent to a track-local role is not permission to fabricate
earlier discovery/evidence/mapper receipts. Each frozen track-local role still
requires its own `fork_turns="none"` provenance, labeled-integer
`actual_usage` per ceiling, zero numeric stop-loss, ancestor-only inputs, and
SHA-256-bound outputs. Specifically:
- The `adversarial-reviewer` receipt must record its own spawn id, parent
  ancestry ids, prompt sha-256, context manifest sha-256, start/end event
  ids, final response sha-256, output sha-256, and budget declaration
  sha-256 — never a placeholder or a hash borrowed from any prior session.
- Prior predecessor receipts (`discovery-auditor`, `evidence-collector`,
  `requirements-mapper`, `truth-test-author`) are not refreshed or replaced
  by the adversarial reviewer invocation. If any predecessor receipt fails
  its `tests/orchestrator_role_receipt_integrity.sh` check (anti-pattern
  A15), Green must remediate via a truthful rerun or an equivalent
  provenance-correct regeneration, and Review A/B/C must re-audit before
  the adversarial reviewer is invoked. The reviewer does not sign off on
  a stale or missing predecessor receipt.
- The browser-review applicability remains `not_applicable` for this
  inventory phase; the strategy records `UX_REQUIRED=never` for the Phase-4
  role gates, and `measure-ux-browser-review` is not invoked. Browser
  acceptance applies only if future evidence changes this determination.

No strategy weakening is authorized as a workaround in any of these steps
(e.g., dropping `fork_turns="none"`, accepting an inherited reviewer context,
accepting an all-`[~]` reviewer state, signing off on a stale predecessor
receipt, or accepting an owner authorization without the four exact hash
bindings is forbidden).

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
corrects a strategy-owned canonical-contract error about
`measure-adversarial-testing`, re-asserts the existing frozen contract, reconciles
it against current evidence, defines the canonical role-to-track-local-ownership
mapping and the order in which the canonical roles (Mid-red, Jr-green, Review
A/B/C, adversarial-testing, phase-acceptance, product-owner, final-acceptance,
closeout) are invoked, and preserves the fabrication guards on earlier discovery,
evidence, mapping, and truth-test receipts. It does not author, mutate, or
approve any Phase-4 artifact; it does not mark any Phase-4 task `[x]`; it does not
request product-owner acceptance; and it does not advance any canonical role's
lifecycle past its current handoff. The canonical `measure-strategy` subagent is
the role that authors this update, which is exactly the contract role described
above.

The ownership boundary is exact on this retry: `truth-test-author` owns
`denominator-contract-test-report.json`; `adversarial-reviewer` owns only
`independent-review.json` and its role receipt; the root coordinator renders both
candidate manifests after that review and both accepted manifests only after the
external human product owner writes an exact-hash `product-owner-acceptance.json`.

The next legal subagent invocation after this strategy commit is the canonical
`measure-mid-red` (truth-test-author) or `measure-jr-green` (discovery-auditor /
evidence-collector / requirements-mapper) for predecessor remediation only. After
the predecessor admission gate is green, Review A/B/C have rerun, and Green has
remediated any blocking findings, the canonical `measure-adversarial-testing`
subagent may be invoked under the bounded frozen track-local `adversarial-reviewer`
ownership, with `fork_turns="none"` isolation, measured labeled-integer budget,
zero numeric stop-loss, and SHA-256-bound outputs as described above.

## Successor evidence-production authority

The final successor Phase-0 authority supersedes the rejected successor commit
`1092da6e56af39c0e392ff9330db5e276f55d5a7`; the original authority was
`6dd43aa834b7193017230843c658d32c19ecd1a9`. The old direct-write-only
`truth-test-author` and `adversarial-reviewer` contracts could author JSON but
could not execute the exact admission, temporary regeneration, or reviewed-input
hash checks required to prove that JSON. Each final role now retains one owned
output and fresh pairwise-isolated provenance, but is limited to `bash`, `read`,
and `write` and exactly one authority-derived verifier command followed
immediately by the frozen `git commit --only <owned-output> -m <subject>` command.
The verifier is loaded from immutable commit
`0e2cbb1ec42ba51a3e59e0c3b2a58077d1bb427b` under `/usr/bin/env -i`,
`/usr/bin/python3 -I -S`, the frozen PATH/LANG, and the frozen runtime hashes.
No additional Bash operation is admissible.

The truth verifier executes the recorded sanitized Phase0-3 admission command in
a unique detached local clone of the exact authority revision, pinning the four
test modules, every transitive import, Git locator, and committed artifact. It requires
exact nonzero module counts `13/17/31/24` (85 total), rejects any failure or skip,
derives per-phase test counts, and requires
`denominator-contract-test-report.json` to match those results exactly. The
reviewer verifier repeats that admission, resolves the replacement
`{phase2_receipt_commit}` through the receipt renderer's immutable commit
binding, requires that receipt to be the latest evidence-collector receipt and
the receipt selected by committed Phase3 provenance, regenerates Phase3 only to
a temporary directory, compares exact bytes, derives the eleven reviewed-input
`revision`/`path`/`sha256` entries from Git, and requires zero unresolved
Critical, High, or Medium findings. Captured regeneration output is bounded to
1 MiB per stream and a 900-second timeout; a bound breach fails closed.

This correction necessarily invalidates **all five** earlier role receipts, not
only the two final roles. Production acceptance admits one Phase-0 authority
commit for the entire role set; every receipt must name that commit, bind the
same exact input-freeze hash, and have an output commit descending from it. The
replacement execution order is therefore discovery-auditor, evidence-collector
(including its newly committed receipt), requirements-mapper using that exact
receipt revision, truth-test-author, then adversarial-reviewer using the same
exact receipt revision. No prior candidate, review, owner approval, or accepted
manifest remains admissible after this successor authority. This section
supersedes the earlier retry statement that prior predecessor receipts need not
be refreshed.
