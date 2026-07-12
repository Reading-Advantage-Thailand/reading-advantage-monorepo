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
