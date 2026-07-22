# Implementation Plan: APK Traversal and Exploration Evidence Cohort

## Phase 0: Freeze cohort and roles

- [x] Task: Verify accepted inputs and spawn distinct discovery auditors, collectors, requirements mappers, browser auditors, truth-test authors, and `fork_turns="none"` reviewers
- [x] Task: Freeze batches `(Dragon Rider, Dungeon Liberator, Spellweaver's Run)`, `(Shadow Gate Dungeon, Labyrinth of the Goblin King, Griffin Rider's Escape)`, and `(The Sorcerer's Ziggurat)`
- [x] Task: Record role receipts, budgets, and stop-loss state
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Batch A

- [x] Task: Complete Dragon Rider evidence package
- [x] Task: Complete Dungeon Liberator evidence package
- [x] Task: Complete Spellweaver's Run evidence package
- [x] Task: Run truth/browser tests and full independent review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Batch B

- [x] Task: Complete Shadow Gate Dungeon evidence package
- [x] Task: Complete Labyrinth of the Goblin King evidence package
- [x] Task: Complete Griffin Rider's Escape evidence package
- [x] Task: Run truth/browser tests and full independent review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Historical/missing batch

- [x] Task: Recover Sorcerer's Ziggurat evidence at exact current/historical sources
- [x] Task: Distinguish implementation fact, active design, catalog prose, and unknown behavior
- [x] Task: Run historical-revision and unsupported-inference tests
- [x] Task: Complete `fork_turns="none"` review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Cohort reconciliation

- [x] Task: Reconcile seven packages against the denominator and role manifests
- [x] Task: Run evidence, scene/state, browser, hash, and stop-loss gates
- [x] Task: Spawn tool-attested full-cohort adversarial review and remediate every Critical, High, and Medium finding
- [x] Task: Publish a non-consumable candidate and review report; after product-owner acceptance bound to their hashes, publish the accepted cohort manifest
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

### Successor lifecycle closeout (2026-07-22)

- Immutable closeout candidate committed at `8a28856e`: SHA-256 `5f7df0f865a476414e0fdbf14e67b0af3b1ab3d8bb86e17c0e7901998b32e46c`.
- Separate current delegated project-owner acceptance: `t5-product-owner-acceptance-v1.json`, SHA-256 `761d3fe586ad27539ac5a24cd75db80a2765645e9e782200ea1e2a5d460e2175`.
- Additive successor accepted-cohort manifest committed at `2e939507`: SHA-256 `4052c243ca66977256a4b60116439884f3f3151fba463ef860e624ed8d050f5d`; status `accepted`, decision `ACCEPT-WITH-DISCLOSURE`, and conditional consumability.
- The committed candidate and successor closeout gates passed 6/6 each (12/12 combined). Historical lifecycle test modules remain immutable red-stage/pre-publication evidence and are not relabelled green.
- Every batch-level historical and browser-unknown disclosure remains binding. This closeout makes no browser, gameplay, completion, persistence, XP, idempotency, API, production, or asset-loading success claim; native provider provenance remains explicitly unavailable.
