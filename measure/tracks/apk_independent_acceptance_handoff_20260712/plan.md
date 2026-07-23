# Implementation Plan: APK Independent Acceptance and Handoff

## Phase 0: Freeze independent review

- [ ] Task: Verify accepted T1 gate and T2–T9 candidate hashes plus the canonical ElvGames root policy, asset contract, generated catalog, import/license receipts, and release-version bindings
- [ ] Task: Validate the independently accepted standard-pack record at
  `packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json`,
  including version `2026.07.23`, catalog/source-receipt digests, catalog artifact
  SHA-256, credit, QC evidence, and downstream consumption rules
- [ ] Task: Spawn a fresh isolated truth-test author, distinct from final reviewers and all incompatible upstream roles, and bind exact T9 candidate and standard-pack release hashes
- [ ] Task: Have the truth-test author write and run omission, contradiction, stale-hash, direct-legacy-path, absent-candidate-key, blocked-mapping, role-independence, pack-release-mismatch, and approval-order negative fixtures; publish the expected Red report before final reviewers consume the candidate
- [ ] Task: Run the same truth gates against the unmodified candidate inputs and publish a candidate gate report; any unexpected failure blocks Phase 1 rather than authorizing remediation by a reviewer
- [ ] Task: Spawn `fork_turns="none"`, tool-attested final reviewers; explicitly exclude root and every incompatible prior role
- [ ] Task: Record reviewer prompts, input hashes, budgets, and stop-loss state
- [ ] Task: Publish a task-ownership manifest assigning every Phase 1–4 audit and finding to an eligible final-review subagent and every T10 truth gate/fixture to the isolated truth-test author
- [ ] Task: Prove failed monolith artifacts are quarantined
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Fresh source and denominator audit

- [ ] Task: Re-run full identity/file/scene/state/history/copy reconciliation
- [ ] Task: Re-run candidate asset count and path reconciliation without adding the complete standard-pack corpus to T8's frozen denominator
- [ ] Task: Compare fresh results to T2 and all cohort coverage
- [ ] Task: Resolve every discrepancy or block acceptance
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Claim and derivation audit

- [ ] Task: Validate every claim locator, cited-range hash, source class, interpretation, conflict, and review receipt
- [ ] Task: Validate every blueprint and effort field against complete upstream claims
- [ ] Task: Validate every capability disposition and exact consumer
- [ ] Task: Validate every responsive contract against game-specific evidence
- [ ] Task: Validate every concrete usage, semantic role/state, candidate join, standard-pack candidate key, and blocked mapping against the canonical root policy
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Runtime and asset evidence audit

- [ ] Task: Review browser evidence for every game accepted as runnable under the program definition and every profile/input/content requirement
- [ ] Task: Review every candidate record, disposition, and adopted mapping; validate the bound standard-pack contract, catalog, import/license receipts, and release without per-file visual audit of the full pack
- [ ] Task: Audit unresolved/provisional decisions and ensure Must-have unknowns and blocked mappings block
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Adversarial acceptance

- [ ] Task: Run omission, contradiction, stale-hash, direct-legacy-path, absent-candidate-key, unsupported-standardization, generator-purity, and role-independence attacks
- [ ] Task: Publish full findings with exact evidence before any approval request
- [ ] Task: Remediate every Critical, High, and Medium finding and rerun all affected gates
- [ ] Task: Stop after two failed fix/review cycles and request product-owner direction
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Product acceptance and handoff

- [ ] Task: Present the complete independent report, canonical root policy, and bound pack artifacts to the product owner
- [ ] Task: BLOCKED — Obtain explicit product-owner acceptance after review — deferred:product-owner
- [ ] Task: Generate final immutable hashes only after acceptance, including canonical root-policy and bound pack contract/catalog/import-license-receipt/release hashes
- [ ] Task: Update shared-kit and cartridge tracks to require exact accepted hashes and canonical-root adoption gates while preserving the independently accepted upstream pack release
- [ ] Task: Prove successor gates reject absent, revoked, stale, mismatched, direct-legacy-path, and non-standard-pack inputs
- [ ] Task: Publish final resource accounting and role receipts
- [ ] Task: BLOCKED — Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner
