# Implementation Plan: APK Action and Defense Evidence Cohort

## Phase 0: Freeze cohort and roles

- [x] Task: Verify accepted gate, denominator, and pilot hashes
- [x] Task: Spawn batch-specific discovery auditors, collectors, requirements mappers, browser auditors, truth-test authors, and `fork_turns="none"` reviewers with tool-attested receipts
- [x] Task: Freeze batches `(Castle Defense, Magic Defense, Wizard vs Zombie)`, `(Village Guardian, Archer's Revenge, Storm the Castle Tower)`, and `(Paladin's Twin-Soul, Gryphon Patrol)`
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Batch A evidence packages

- [x] Task: Complete Castle Defense exact evidence, scene/state, responsive, and asset-usage package
- [x] Task: Complete Magic Defense exact evidence, scene/state, responsive, and asset-usage package
- [x] Task: Complete Wizard vs Zombie exact evidence, scene/state, responsive, and asset-usage package
- [x] Task: Run truth tests and full independent batch review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Batch B evidence packages

- [x] Task: Complete Village Guardian package
- [x] Task: Complete Archer's Revenge package
- [x] Task: Complete Storm the Castle Tower package
- [x] Task: Run truth tests and full independent batch review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [x] Remediation: Reassert lifecycle stop-loss for unauthenticated/unordered Batch B acceptance evidence; preserve historical artifacts and prohibit consumption pending authorized owner action
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Batch C evidence packages

- [x] Task: Complete Paladin's Twin-Soul package — source, collector, mapper, semantic-remediation, browser-disposition, and asset evidence committed through `64630a30`
- [x] Task: Complete Gryphon Patrol package — source, collector, mapper, semantic-remediation, browser-disposition, and asset evidence committed through `64630a30`
- [x] Task: Run truth tests and full independent batch review; reconcile severity counts and remediate every Critical, High, and Medium finding — the selected v4 lineage has a green Batch C truth gate and a zero-Critical/High/Medium full-cohort review at `81bfe78e`; the original C0-C4 selector, Browser v5, collided Asset v4 and Gryphon Mapper v5 sets remain historical and non-consumable.
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Cohort reconciliation

- [x] Task: Reconcile all eight packages against every assigned denominator item — v4 reconciliation at `d009b9a3` preserves exactly-once eight-game scope.
- [x] Task: Run browser, evidence-hash, claim, scene/state, role-receipt, and stop-loss gates — the accepted v4 lineage retains its bounded Kimi, asset, and historical-lifecycle disclosures.
- [x] Task: Spawn `fork_turns="none"`, tool-attested full-cohort adversarial review — v4 review at `81bfe78e` has zero unresolved Critical, High, or Medium findings.
- [x] Task: Publish non-consumable candidate cohort manifest, complete review report, and resource report — candidate v2 was published at `d70959ce`.
- [x] Task: Obtain product-owner acceptance bound to exact candidate/review hashes, then publish the accepted cohort manifest — acceptance v2 `1d56853d`, accepted manifest v2 `8b3a83d3`, and owner admission disposition `43928b9a`; acceptance is conditional and disclosure-bound.
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner
