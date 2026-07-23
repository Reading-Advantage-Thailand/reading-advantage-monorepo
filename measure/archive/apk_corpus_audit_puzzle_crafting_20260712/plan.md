# Implementation Plan: APK Puzzle and Crafting Evidence Cohort

## Phase 0: Freeze cohort and roles

- [x] Task: Verify accepted inputs and spawn distinct discovery, evidence, requirements-mapping, browser, truth-test, and `fork_turns="none"` review agents
- [x] Task: Freeze batches `(Enchanted Library, Rune Match, Alchemist's Synthesis)` and `(Potion Rush, Rune Forge Chamber, Astral Mage)`
- [x] Task: Record role receipts, budgets, and stop-loss state
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Batch A

- [x] Task: Complete Enchanted Library evidence package
- [x] Task: Complete Rune Match evidence package
- [x] Task: Complete Alchemist's Synthesis evidence package
- [x] Task: Run truth/browser tests and full independent review; reconcile severity counts and remediate every Critical, High, and Medium finding
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Batch B

- [x] Task: Complete Potion Rush evidence package — exact current-source envelopes accepted in the successor lifecycle; browser-dependent behavior remains unknown
- [x] Task: Complete Rune Forge Chamber evidence package — exact current-source envelopes accepted with duplicate-token and RNG conflicts explicit; browser-dependent behavior remains unknown
- [x] Task: Recover Astral Mage evidence and explicit unknowns without analogy — current catalog withdrawal and reachable deleted implementation remain source-classified; browser-dependent behavior remains unknown
- [x] Task: Run truth/browser/historical tests and full independent review; reconcile severity counts and remediate every Critical, High, and Medium finding — V1 at `91e6331b` remains historical, non-authoritative, and non-consumable. Fresh full-cohort review `752fecfd`, successor candidate `b3c95ab3`, product-owner acceptance `ed1f3df3`, and accepted manifest `43b72620` establish conditional evidence consumption with zero unresolved Critical, High, or Medium findings; no browser run or behavior success is claimed.
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Content and responsive reconciliation

- [x] Task: Reconcile prompt/answer/duplicate/progression evidence across six packages
- [x] Task: Validate real Thai/English content bounds and enlarged-text browser evidence
- [x] Task: Reconcile station/node/board geometry, input modes, and simultaneous visibility
- [x] Task: Stop on any inferred-as-fact content or responsive claim
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Cohort acceptance

- [x] Task: Reconcile all packages against denominator and role receipts
- [x] Task: Run evidence, scene/state, browser, candidate-usage, hash, and stop-loss gates
- [x] Task: Spawn tool-attested full-cohort adversarial review and remediate every Critical, High, and Medium finding
- [x] Task: Publish a non-consumable candidate and review report; after product-owner acceptance bound to their hashes, publish the accepted cohort manifest
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner


### Successor lifecycle closeout (2026-07-22)

- Fresh full-cohort review: `full-cohort-independent-review-v2.json` at `752fecfd`, SHA-256 `43e5ad76695cc67e57ab082468ce4400f973a388005dfb45b1810608d8115505`; reviewer receipt SHA-256 `5d97a63c64a401dc71aefecdb6c440330bc555917e142fd889c63d263bc9a319`.
- Non-consumable successor candidate: `successor-candidate-cohort-manifest-v2.json` at `b3c95ab3`, SHA-256 `d48f518dd3cb19ea54dfe39dc63942592750493b915e82153923c5fa9eb78fb7`.
- Product-owner acceptance: `product-owner-acceptance-successor-v2.json` at `ed1f3df3`, SHA-256 `fbc6f24f7b56a6ce8c5972e7fba29c8702813f8bc6def09e866530f6d2ecf4df`.
- Accepted successor manifest: `successor-accepted-cohort-manifest-v2.json` at `43b72620` with `ACCEPT-WITH-DISCLOSURE` and conditional consumability.
- Active admission gate: `PYTHONDONTWRITEBYTECODE=1 python3 measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/t6-successor-acceptance-consumption-gate.py` — passed. The candidate-only gate is a historical pre-acceptance snapshot and was not rerun after acceptance publication.
- Accounting: 19 completed tasks, 5 explicitly deferred product-owner manual-verification tasks, 0 in progress. V1 remains historical, non-authoritative, and non-consumable.
- No browser, gameplay, responsive, trusted-input, completion, persistence, XP, API, production, asset-loading, implementation, shipping, or ontology success is claimed.
