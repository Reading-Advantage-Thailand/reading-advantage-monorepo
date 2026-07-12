# Implementation Plan: Measure APK Evidence Integrity Gates

## State and execution rules

`[~]` means executable/incomplete. `[x]` records completed work with executable evidence.
`[b] deferred:<owner>` is reserved
for the real product-owner/manual-verification gate and is never completion. Each phase
must follow the Red/Green/closeout gates in `test-strategy.md`; a passing schema or
documentation check is not evidence that a live gate works. Product work is prohibited
until Phase 4's accepted gate manifest exists.

## Phase 0: Freeze failure cases, contracts, and role boundaries (FR3–FR5 foundation)

- [x] Task: Spawn distinct gate-contract, counterexample, and adversarial-review roles; publish task ownership manifests and tool-attested receipts before they author substantive outputs. The owner-designated OpenCode sessions are bound in `phase0-opencode-provenance.json`; live `opencode export <sessionID>` verification checks distinct session, agent, parent/message IDs, chronology, prompt/final-response hashes, disjoint outputs, and independent-review ordering. OpenCode 1.17.18 does not export `fork_turns`, so the evidence records `schema-field-absent` rather than fabricating it.
- [x] Task: Freeze attempts 1–5 as immutable, named negative fixtures; record the baseline gate commit, allowed-input hashes, candidate-output paths, and gate-edit prohibition. The fixture suites and live allowed-input hashes pass. The placeholder legacy receipt remains immutable and is explicitly superseded by tool-exported role evidence; it is not treated as completion evidence.
- [x] Task: Define versioned envelope, numeric-budget/unit, severity, stop-loss, acceptance, revocation, and canonical `depends_on` contracts; reject `unmeasured` rather than defaulting it. (Green: parse_labeled_budget rejects `unmeasured`, generic/date labels, and non-positive values; validate_envelope rejects arbitrary success statuses, forged/missing baselines, missing/unknown schemas, and empty contracts; validate_dependency_field rejects the `dependencies` alias; validate_plan_marker rejects legacy `[ ]`. Green SHA: ad45eebd02a1f5a9c787da268d0784854be57b63; security fail-closed fix: b862e37e. **Phase 0 retry Green: the seven validator bodies are implemented. `validate_severity` rejects unknown levels, missing rationales, and empty evidence refs. `validate_stop_loss` rejects oversized batches and disabled triggers. `validate_acceptance` rejects disabled review/owner-approval/pilot flags and non-canonical ordering. `validate_revocation` rejects no-trigger and unguarded-revalidation records. `validate_allowed_input_manifest` recomputes the `inputs_manifest_hash` and verifies each input path's live SHA-256. `validate_role_provenance` rejects placeholder and empty provenance fields. `assert_acceptance_requires_authentic_provenance` rejects acceptance transitions without a trusted receipt. The 24 rejection codes remain frozen and unchanged.**)
- [x] Task: Build the fixture harness and its positive-control corpus without encoding APK product conclusions. (Green: test_contract_scaffold passes 46 tests exercising A3/A4/A5/A6/A8/A12 defenses. The positive claim control is explicitly synthetic and contains no APK product claim. The aggregate A12 sweep now fails closed while known catalog guards remain dangling; this task does not claim repository-wide A12 resolution. Green SHA: ad45eebd02a1f5a9c787da268d0784854be57b63; security fixes: b862e37e, 62dd28ba, 4a858038. **Phase 0 retry Green: 5 new valid controls and 12 new invalid controls pass their respective validators. `control_allowed_inputs.json` carries real input hashes and a computed `inputs_manifest_hash`. The `test_phase0_retry_contracts` suite exercises the semantic value contracts without encoding any APK product conclusion.**)
- [x] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md). The current user explicitly designated the four role sessions and authorized Phase 0 completion; `phase0-owner-authorization.json` binds that exact instruction without inventing an unavailable event ID.

### Phase 0 retry Red evidence (recorded by `measure-mid-red`, NOT committed)

- Targeted Red command (per test-strategy.md §'Retry Phase 0B'):
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_phase0_retry_contracts`
- Observed result at HEAD: **23 tests run, 4 pass (module surface / manifest registration), 19 errors** (every behavioural test fails with `NotImplementedError: Phase 0 retry contract: <validator> body is Green-phase work`). Exit code **1** (Red).
- Why this is the expected Red state: the Phase 0 retry contract freeze adds seven validator signatures (`validate_severity`, `validate_stop_loss`, `validate_acceptance`, `validate_revocation`, `validate_allowed_input_manifest`, `validate_role_provenance`, `assert_acceptance_requires_authentic_provenance`), 24 stable rejection codes, and the manifest `allowed_inputs` block. The SIGNATURES and the FROZEN REJECTION_CODES are the freeze; the BODIES are Green-phase work. The existing 46-test `test_contract_scaffold` suite is unchanged and still passes (no weakening).

### Phase 0 retry Green evidence (recorded by `measure-jr-green`, committed in the single retry commit)

- Targeted Green command (per test-strategy.md §'Retry Phase 0B'):
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_phase0_retry_contracts`
- Observed result at HEAD after Green: **23 tests run, 0 failures, 0 errors**. Exit code **0** (Green).
- Existing scaffold command:
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.evidence_integrity_gates.test_contract_scaffold`
- Observed scaffold result: **46 tests run, 0 failures, 0 errors**. Exit code **0** (no regression).
- What changed: the seven validator bodies in `contracts.py` are implemented (no more `NotImplementedError`). `control_allowed_inputs.json` and `manifest.json`'s `allowed_inputs` block carry real SHA-256 hashes and a computed `inputs_manifest_hash`. No test was weakened; no rejection code was removed; no fixture was relaxed.
- What did NOT change: the frozen REJECTION_CODES set, the GATE_VERSION, the SCHEMA_VERSION, the FROZEN_ATTEMPTS bindings, the existing scaffold semantics, and the `allowed_inputs` manifest kind. The legacy placeholder receipt remains immutable rejected evidence.
- Phase 0 provenance resolution: the later owner-designated OpenCode adapter exports all four distinct sessions and binds their real session/agent/parent/message IDs, timestamps, prompt/final-response hashes, and disjoint output hashes. The schema does not expose `fork_turns`; that check is recorded as unavailable, while reviewer independence is truthfully enforced by a distinct reviewer session and post-author chronology.

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
