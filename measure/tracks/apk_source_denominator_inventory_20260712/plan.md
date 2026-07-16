# Implementation Plan: APK Independent Source Denominator Inventory

## Phase 0: Freeze inputs and independent methods

- [x] Task: Bind the accepted truth-gate manifest and quarantine all failed-track factual inputs. Evidence: `phase0-input-freeze.json`; focused falsification test; freeze commit `bb95b523`. No source discovery occurred.
- [x] Task: Freeze the required mechanical-discovery, human-discovery, historical, asset, truth-test, and adversarial-review role ownership and isolation contract without launching a discovery session. Evidence: `phase0-role-ownership-manifest.json`; focused falsification test; freeze commit `bb95b523`.
- [x] Task: Freeze the current revision, ancestor-only historical search rule, roots, exclusions, numeric resource ceilings, stop-loss thresholds, expected artifact schemas/paths, and exact Red/Green/project gate commands. Evidence: `phase0-input-freeze.json`; `test-strategy.md`; focused falsification test; freeze commit `bb95b523`.
- [x] Task: Measure - Owner verification 'Phase 0' (Protocol in workflow.md). Evidence: reconciliation-integrator reran `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0` (5 passed) against the frozen predecessor, scope, quarantine, ownership, and stop-loss gate at reconciliation commit `7b595ae2`; product-owner acceptance is not claimed.

## Phase 1: Mechanical discovery

- [x] Task: Enumerate catalog, routes, registrations, components, logic, tests, copies, and graph relationships. Evidence: `source-denominator.json`; `game-identity-ledger.json`; frozen baseline locators and hashes verified by `phase1-green-test-report.json`.
- [x] Task: Discover scene/state symbols and transitions without authored fallback IDs. Evidence: `scene-state-denominator.json`; focused Phase-1 GREEN contract in `phase1-green-test-report.json`.
- [x] Task: Enumerate asset/audio/data files with hashes and format metadata. Evidence: `asset-file-denominator.json`; `historical-source-denominator.json`; `denominator-discrepancies.json`; `denominator-method.md`; focused Phase-1 GREEN contract in `phase1-green-test-report.json`.
- [x] Task: Run negative fixtures proving failed-track generators cannot supply the denominator. Evidence: `source-denominator.json.quarantine_fixtures`; focused Phase-1 GREEN contract in `phase1-green-test-report.json`.
- [x] Task: Measure - Owner-verified mechanical verification 'Phase 1'. Evidence: discovery-auditor verification commands and results in `phase1-green-test-report.json`; product-owner acceptance is not claimed.

## Phase 2: Independent human discovery

- [x] Task: Review raw current sources in batches of no more than three games. Evidence: `independent-human-discovery.json`; six explicit batches cover all 17 Phase-1 identities with committed source locators; evidence commit `4b6175f4`.
- [x] Task: Review Reading/Primary copies and map duplication/behavior drift. Evidence: `human-duplicate-drift-records.json`; separate Reading and Primary observations cover every identity without path merging; evidence commit `4b6175f4`.
- [x] Task: Review historical/deleted implementations at exact reachable revisions. Evidence: `human-historical-deleted-records.json`; 139 Phase-1 deleted locators were independently re-resolved from reachable revisions; evidence commit `4b6175f4`.
- [x] Task: Record separate agent receipts and claim-level evidence. Evidence: `role-receipts/evidence-collector.json`, `role-logs/phase2-evidence-collector-green.log`, and `phase2-green-test-report.json`; evidence commit `e0b775d5`.
- [x] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md). Evidence: the explicit evidence-collector verification log and Phase-2 Green report at `e0b775d5`; product-owner acceptance is not claimed.

## Phase 3: Reconciliation

- [x] Task: Reconcile mechanical and human identity/file denominators. Evidence: `phase3-reconciliation.json` regenerated from worktree Phase-1 (including five paths added at `e14ab11e`) and worktree Phase-2 mechanical-record reviews, with program dispositions bound from committed Phase-2 at `803e1d8b`; records 17 identity, 579 file, and 1659 source-record comparisons with paired raw evidence; the Phase-3 focused contract passed (10 tests).
- [x] Task: Reconcile every scene, state, phase, overlay, transition, and terminal surface. Evidence: `phase3-reconciliation.json` records 118 surface comparisons (restructured at `3384f558`) and all seven category coverage records; the Phase-3 focused contract passed.
- [x] Task: Reconcile every candidate asset and identical-hash group. Evidence: `phase3-reconciliation.json` records 353 asset-candidate and 153 identical-hash-group comparisons with paired raw evidence; the Phase-3 focused contract passed.
- [x] Task: Resolve every duplicate, stale, missing, withdrawn, and historical discrepancy. Evidence: `phase3-reconciliation.json` records 361 discrepancy comparisons and the 29 reviewed program identities as 17 current plus 12 historical/withdrawn; `unresolved_sources` is empty.
- [x] Task: Stop rather than infer when sources remain incomplete. Evidence: the Phase-3 contract validates every historical locator/reachable ancestor and permits completion only when `unresolved_sources` is empty; deterministic regeneration SHA-256 is `cd72b34a77fce57c62a8976087fb029611a1c78429af7da485780aba5663d1d3`.
- [x] Task: Measure - Owner verification 'Phase 3' (Protocol in workflow.md). Evidence: reconciliation-integrator results in `phase3-green-test-report.json` at `faf584d3`; the Phase-3 focused contract passed (10 tests), and product-owner acceptance is not claimed. Phase 3 was reopened because `source-denominator.json` was modified at `e14ab11e` and `scene-state-denominator.json` at `3384f558` without regenerating the reconciliation; the regeneration commit `faf584d3` restores Plan truth.

## Phase 4: Full independent acceptance

- [b] Task: Spawn a `fork_turns="none"`, tool-attested reviewer to re-run full denominator reconciliation; the root/Green agent is forbidden from the adversarial-reviewer role per `phase0-role-ownership-manifest.json` (`root_agent.forbidden_roles` includes `adversarial-reviewer`); the Phase-3 file-reconciliation gap from `e14ab11e` has been repaired (phase3-reconciliation.json regenerated, Phase-3 focused contract passes), but the Admission gate still requires the committed Phase 0-3 predecessor contracts to pass together against committed inputs before the reviewer may begin (deferred:adversarial-reviewer)
- [b] Task: Run claim hash, revision reachability, denominator, role-receipt, and stop-loss validators (deferred:adversarial-reviewer)
- [b] Task: Remediate every Critical, High, and Medium finding (deferred:adversarial-reviewer)
- [b] Task: Publish non-consumable candidate denominator and partition manifests plus complete review report (deferred:adversarial-reviewer)
- [b] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish accepted denominator and partition manifests (deferred:product-owner)
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) (deferred:product-owner)

### Phase-4 Red command evidence (mid-red run, role-base 9849e6a963bb2518f8306b33b205ff4f714daad5)

- Static syntax: `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_apk_source_denominator_inventory_phase4.py` — exit 0, no syntax regression.
- Admission gate: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase0 measure.tests.test_apk_source_denominator_inventory_phase1 measure.tests.test_apk_source_denominator_inventory_phase2 measure.tests.test_apk_source_denominator_inventory_phase3` — 32/32 passed against committed Phase 0–3 inputs.
- Focused Red command: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_apk_source_denominator_inventory_phase4` — exit 1, FAILED (failures=35) for two stable categorized reasons:
  - 25/35 fail because the production `validate_phase4_inventory_acceptance` validator is absent and the temporary fail-open sentinel returns `{"ok": True, "code": "LEGACY_PHASE4_FAIL_OPEN"}`; the paired-control assertion (`control.ok is False` with stable sentinel code) is the non-vacuous falsification of that absence (1 explicit control test + 24 Green-branch counterexamples).
  - 10/35 fail because the Phase-4 live-track contract requires `measure/tracks/apk_source_denominator_inventory_20260712/independent-review.json` to exist before the focused contract may proceed.
- Global guards: `bash tests/orchestrator_supervisor_invariants.sh` PASS (A1/A8); `bash tests/orchestrator_detector_syntax.sh` PASS (A14).
