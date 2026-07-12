# Implementation Plan: Measure APK Evidence Integrity Gates

## Phase 0: Freeze failure cases and roles

- [ ] Task: Spawn separate gate-contract, counterexample, and adversarial-review subagents and record role receipts
- [ ] Task: Freeze attempts 1–5 failure fixtures and gate-edit prohibition
- [ ] Task: Define immutable numeric budget fields/units, fail-closed `unmeasured` behavior, acceptance schema, automatic revocation, and stop-loss states
- [ ] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md)

## Phase 1: Claim-evidence contracts and Red tests

- [ ] Task: Define strict claim, evidence, cited-range hash, conflict, and review schemas
- [ ] Task: Write Red tests for directory citations, stale hashes, unreachable revisions, generated self-citation, and inference-as-fact
- [ ] Task: Implement validators without APK product assumptions
- [ ] Task: Run focused coverage and counterexample mutation checks
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Denominator and role-independence gates

- [ ] Task: Define independent denominator and reconciliation schemas
- [ ] Task: Define tool-attested receipts, task ownership, role applicability, and incompatible-role matrix
- [ ] Task: Write Red fixtures for authored denominators, synthetic scenes, missing roles, copied IDs in fabricated receipts, root self-substitution, unowned outputs, output-hash mismatch, inherited reviewer context, forged/replayed owner approval, and dependency aliases
- [ ] Task: Implement denominator and role validators
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

## Phase 3: Stop-loss and completion enforcement

- [ ] Task: Write Red tests for oversized batches, unsupported claims, denominator mismatches, repeated review failure, unresolved findings, and unmeasured resources
- [ ] Task: Implement stop-loss state transitions and completion blockers
- [ ] Task: Prove no product track can alter its gate version after execution begins
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

## Phase 4: Supervisor integration and independent audit

- [ ] Task: Modify `measure/automation-supervisor.py` only within this dedicated track
- [ ] Task: Run supervisor invariant, marker, truthfulness, and A1–A13 anti-pattern suites
- [ ] Task: Spawn a `fork_turns="none"` adversarial reviewer with tool-attested provenance and no implementation narrative
- [ ] Task: Remediate every Critical, High, and Medium finding
- [ ] Task: Publish non-consumable candidate gate manifest and complete review report
- [ ] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish the accepted gate manifest
- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)
