# Specification: Measure APK Evidence Integrity Gates

## Overview

Create dedicated Measure/orchestrator infrastructure that makes unsupported APK completion mechanically impossible. This track produces no product conclusions and may modify `measure/automation-supervisor.py` only with dedicated reviewer evidence and the orchestrator anti-pattern audit.

It inherits every mandatory role, evidence, generator, stop-loss, and shortcut-rejection rule in `measure/apk-evidence-reconstruction-program.md`.

## Functional requirements

### FR1: Claim-evidence validation

Define a versioned schema and validator requiring exact revision, file, line range, cited-range hash, extracted fact, separate interpretation, confidence, collector identity, conflict state, and reviewer disposition. Reject directories, generated prose as primary evidence, stale hashes, unreachable revisions, and inference presented as fact.

### FR2: Independent denominator validation

Define denominator item and reconciliation schemas. Authored requirement outputs cannot supply their own completeness denominator.

### FR3: Role independence

Define tool-attested role receipts and per-task ownership manifests. Mechanically reject missing collaboration-event provenance; reviewer isolation lacking both explicit `fork_turns=none` and equivalent retained raw-export proof of an exactly fresh first prompt with no inherited pre-prompt turns; incompatible roles; fabricated/copied IDs; unowned outputs; output/final-response hash mismatch; or root-authored substantive work. Product-owner acceptance must resolve every named review, approval, and root-designation session through the trusted live provider adapter; compare exact session, parent, agent, event IDs, event text, timestamps, and retained event bytes; fail closed when the provider tool or session is unavailable or differs; verify post-review chronology; bind the exact candidate/review/gate values in the approval prompt; and reject replay. Retained local exports and their hashes are necessary but never sufficient evidence. Root owner designation must be the exact user-event text `For this project, YOU are the orchestrator, therefore YOU are acting as the owner.`; role labels, artifact fields, and semantic substrings cannot substitute for that contract.

### FR4: Truthfulness counterexamples

Ship fixtures proving the validator rejects every known failure from attempts 1–5: synthetic scenes, directory citations, hardcoded summaries presented as evidence, keyword responsive profiles, slug asset allowlists, authored-output coverage, cohort-only asset inspection, and self-review.

### FR5: Stop-loss and completion gates

Enforce batch size, unsupported-claim stop, denominator mismatch stop, two-cycle block, unresolved-severity block, fail-closed numeric resource accounting, candidate/acceptance ordering, automatic revocation, and required pilot acceptance.

### FR6: Supervisor integration

Integrate gates into Measure completion without substring-as-signal, self-edit bypass, dependency-field aliasing, or drive-by changes. Require canonical `depends_on`, run the full orchestrator anti-pattern audit, and obtain independent reviewer evidence.

## Acceptance criteria

- Every known bad fixture fails for the intended reason.
- Valid exact-source fixtures pass.
- A fixture track cannot complete with any missing role, evidence, denominator, review, stop-loss, or acceptance artifact.
- Product-owner acceptance freezes an exact gate commit and manifest hash before product execution. Every product track records that version before its first task; any gate change creates a new version and invalidates active candidates until revalidation. A validated product track cannot modify its gate.
- An independent adversarial subagent reports zero unresolved Critical, High, or Medium findings.
- Product owner approves the gate version before any APK pilot work begins.

## Out of scope

- Discovering games.
- Writing APK requirements or ontology.
- Auditing assets.
- Implementing developer-kit or cartridge features.
