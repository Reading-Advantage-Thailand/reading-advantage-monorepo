# Implementation Plan: Measure APK Evidence Integrity Gates

## State and execution rules

All implementation tasks below are incomplete. `[~]` means executable/incomplete, not
tested or accepted; no task is marked `[x]` at setup. `[b] deferred:<owner>` is reserved
for the real product-owner/manual-verification gate and is never completion. Each phase
must follow the Red/Green/closeout gates in `test-strategy.md`; a passing schema or
documentation check is not evidence that a live gate works. Product work is prohibited
until Phase 4's accepted gate manifest exists.

## Phase 0: Freeze failure cases, contracts, and role boundaries (FR3–FR5 foundation)

- [~] Task: Spawn distinct gate-contract, counterexample, and adversarial-review roles; publish task ownership manifests and tool-attested receipts before they author substantive outputs. deferred:orchestrator-role-spawn — the Red and Green subagents honestly recorded that distinct role separation has NOT been achieved; the closeout gate requires different authors for contract/counterexample/review work and remains unsatisfied.
- [x] Task: Freeze attempts 1–5 as immutable, named negative fixtures; record the baseline gate commit, allowed-input hashes, candidate-output paths, and gate-edit prohibition. (Green: contracts.validate_fixture_manifest enforces every attempt is represented with its exact stable rejection code and paired valid control; the manifest freezes baseline_gate_commit f61eb643, gate_edit_prohibition, and live-verified fixture hashes. Green SHA: ad45eebd02a1f5a9c787da268d0784854be57b63; security fail-closed fix: b862e37e)
- [x] Task: Define versioned envelope, numeric-budget/unit, severity, stop-loss, acceptance, revocation, and canonical `depends_on` contracts; reject `unmeasured` rather than defaulting it. (Green: parse_labeled_budget rejects `unmeasured`, generic/date labels, and non-positive values; validate_envelope rejects arbitrary success statuses, forged/missing baselines, missing/unknown schemas, and empty contracts; validate_dependency_field rejects the `dependencies` alias; validate_plan_marker rejects legacy `[ ]`. Green SHA: ad45eebd02a1f5a9c787da268d0784854be57b63; security fail-closed fix: b862e37e)
- [x] Task: Build the fixture harness and its positive-control corpus without encoding APK product conclusions. (Green: test_contract_scaffold passes 45 tests exercising A3/A4/A5/A6/A8/A12 defenses. The positive claim control is explicitly synthetic and contains no APK product claim. The aggregate A12 sweep now fails closed while known catalog guards remain dangling; this task does not claim repository-wide A12 resolution. Green SHA: ad45eebd02a1f5a9c787da268d0784854be57b63; security fixes: b862e37e, 62dd28ba)
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) deferred:product-owner

## Phase 1: Claim-evidence contracts and Red tests (FR1, FR4)

- [~] Task: Define strict claim, source locator, cited-range hash, fact/interpretation, confidence, conflict, collector, and reviewer schemas with a schema-version discriminator.
- [~] Task: Write focused Red tests for directories, stale ranges/hashes, unreachable revisions, generated self-citations, and inference stated as fact; include a valid exact-source control.
- [~] Task: Implement a pure validator and a Git source adapter that resolves the claimed revision/file/range rather than trusting submitted text.
- [~] Task: Run focused mutation/refutation checks and record each rejected fixture's stable reason code.
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) deferred:product-owner

## Phase 2: Independent denominator and role-independence gates (FR2–FR4)

- [~] Task: Define independent denominator-item, discovery-origin, reconciliation, and coverage schemas; prohibit authored requirement outputs from being their own denominator source.
- [~] Task: Define ownership manifests, role-applicability and incompatible-role matrices, collaboration-event receipts, event-resolver interface, output inventory, and approval-event contracts.
- [~] Task: Write Red fixtures for authored denominators, synthetic scenes, hardcoded summaries, keyword-responsive profiles, slug asset allowlists, cohort-only asset inspection, missing roles, copied IDs, root substitution, unowned outputs, final-response/output hash mismatch, inherited reviewer context, forged/replayed owner approval, and `dependencies` aliasing.
- [~] Task: Implement denominator, receipt, role, output-ownership, and authentic-approval validators with stable rejection codes.
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) deferred:product-owner

## Phase 3: Stop-loss, freeze, and completion enforcement (FR5)

- [~] Task: Write Red transition tests for batch size over three, unsupported claims, denominator mismatches, two failed fix/review cycles, unresolved Critical/High/Medium findings, and each unmeasured or non-numeric resource field.
- [~] Task: Implement fail-closed stop-loss transitions, deterministic blocker reasons, candidate-to-review-to-approval-to-accepted ordering, automatic revocation, and required pilot-acceptance checks.
- [~] Task: Prove a product track cannot start without the accepted Phase 4 version and cannot alter that version, its manifest hash, or gate files after its first task; require revalidation after any gate/input change.
- [~] Task: Exercise valid and invalid state histories end-to-end through the CLI/adapter, not only through direct data-structure construction.
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) deferred:product-owner

## Phase 4: Supervisor integration, independent audit, and acceptance (FR6)

- [~] Task: Modify `measure/automation-supervisor.py` only in this dedicated track to invoke the versioned gate runner and canonical `depends_on` checks; retain structured marker/block handling and fail closed on absent gate records.
- [~] Task: Extend and run focused gate tests plus supervisor invariants, marker vocabulary, review-execution truthfulness, catalog-reference, archive-resolution, generated-facts, and A1–A13 audit checks.
- [~] Task: Spawn a `fork_turns="none"` adversarial reviewer from raw sources, manifests, receipts, and revision range only; resolve every Critical, High, and Medium finding, or stop.
- [~] Task: Publish a non-consumable candidate gate manifest, live-run report, resource report, and independent review report with exact hashes.
- [b] Task: Obtain a product-owner acceptance event bound to the exact candidate/review/gate hashes; only then generate the accepted gate manifest deferred:product-owner
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) deferred:product-owner
