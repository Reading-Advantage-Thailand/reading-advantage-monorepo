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

- [x] Task: Reconcile mechanical and human identity/file denominators. Evidence: `phase3-reconciliation.json` at `7b595ae2` records 17 identity, 574 file, and 1031 source-record comparisons with paired raw evidence; the Phase 0-3 focused contract passed (31 tests).
- [x] Task: Reconcile every scene, state, phase, overlay, transition, and terminal surface. Evidence: `phase3-reconciliation.json` at `7b595ae2` records 66 surface comparisons and all seven category coverage records; the Phase-3 focused contract passed.
- [x] Task: Reconcile every candidate asset and identical-hash group. Evidence: `phase3-reconciliation.json` at `7b595ae2` records 353 asset-candidate and 153 identical-hash-group comparisons with paired raw evidence; the Phase-3 focused contract passed.
- [x] Task: Resolve every duplicate, stale, missing, withdrawn, and historical discrepancy. Evidence: `phase3-reconciliation.json` at `7b595ae2` records 353 discrepancy comparisons and the 29 reviewed program identities as 17 current plus 12 historical/withdrawn; `unresolved_sources` is empty.
- [x] Task: Stop rather than infer when sources remain incomplete. Evidence: the Phase-3 contract at `7b595ae2` validates every historical locator/reachable ancestor and permits completion only when `unresolved_sources` is empty; deterministic regeneration SHA-256 is `60a5a77ede93982e1b51053fca246b2dfc4774cc02d0db27d50dd6012d06fd14`.
- [x] Task: Measure - Owner verification 'Phase 3' (Protocol in workflow.md). Evidence: reconciliation-integrator results in `phase3-green-test-report.json` and `role-logs/phase3-requirements-mapper-green.log` at reconciliation commit `7b595ae2`; all Phase 0-3 focused tests passed, Phase-2 receipt binding at `412c0222` passed, and product-owner acceptance is not claimed.

## Phase 4: Full independent acceptance

- [~] Task: Spawn a `fork_turns="none"`, tool-attested reviewer to re-run full denominator reconciliation
- [~] Task: Run claim hash, revision reachability, denominator, role-receipt, and stop-loss validators
- [~] Task: Remediate every Critical, High, and Medium finding
- [~] Task: Publish non-consumable candidate denominator and partition manifests plus complete review report
- [b] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish accepted denominator and partition manifests — deferred:product-owner
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner
