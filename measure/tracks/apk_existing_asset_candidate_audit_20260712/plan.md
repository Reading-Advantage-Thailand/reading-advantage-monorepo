# Implementation Plan: APK Per-Candidate Asset Forensics

## Phase 0: Freeze candidate denominator and roles

- [x] Task: Verify accepted gate, denominator, and pilot hashes (79ab26dc)
- [x] Task: Publish role ownership and dispatch only the Phase 0 discovery, truth-test, and independent-review roles; later content roles remain undispatched (79ab26dc)
- [x] Task: Freeze roots, exact candidate count, identical-hash grouping policy, inspection batches, and stop-loss budget (79ab26dc)
- [x] Task: Root-orchestrator fitness verification for Phase 0 using automated contracts and independent review (79ab26dc)

## Phase 1: Mechanical metadata and caller inventory

- [x] Task: Record hash, format, dimensions/duration, encoding, alpha/color/audio metadata for every path (b2ea5b49)
- [x] Task: Detect corrupt, empty, mislabeled, text, and unreadable files (b2ea5b49)
- [x] Task: Map every candidate to current callers/use and duplicate paths (phase1-caller-v22-independent-review.json)
- [x] Task: Reconcile output count exactly to the denominator (phase1-green-test-report-v1.json)
- [x] Task: Root-orchestrator fitness verification for Phase 1 using automated and independent evidence (phase1-root-acceptance.json)

## Phase 2: Provenance and license audit

- [x] Task: Inspect sidecars, repository history, approved authoring sources, and licenses per candidate/group
- [x] Task: Record exact provenance evidence or explicit unknown status
- [x] Task: Prove unknown provenance cannot receive reuse/adapt disposition
- [x] Task: Run independent provenance review
- [x] Task: Root-orchestrator fitness verification for Phase 2 using automated and independent evidence (forensics-contract-tests.py GREEN; AF-01..AF-12 independent reviews)

## Phase 3: Candidate-level visual and audio inspection

- [~] Task: Inspect every candidate or justified identical-hash group; record each path
- [b] Task: Record visible/audible content, state/direction coverage, baked text/UI, placeholder, and corruption risks — deferred:direct-audio-multimodal-inspection
- [b] Task: Preserve contact sheets/audio playlists only as navigation evidence — deferred:direct-audio-multimodal-inspection
- [b] Task: Reconcile every inspection receipt to candidate rows — deferred:phase3-inspection-records
- [b] Task: BLOCKED — Root-orchestrator fitness verification for Phase 3 using direct asset inspection and independent evidence (deferred:phase3-green)

## Phase 4: Responsive legacy-function and replacement join

- [b] Task: Join candidates to accepted concrete scene usages from pilot and cohort manifests — deferred:phase3-root-acceptance
- [b] Task: Record compact/wide, text-capacity, focal/crop/tile/slice, state, collision/readability, and current legacy-function evidence — deferred:phase3-root-acceptance
- [b] Task: Record semantic-role/state replacement or retirement evidence; direct legacy paths remain evidence only and never become canonical standard-pack candidate keys — deferred:phase3-root-acceptance
- [b] Task: Stop on missing scene-usage evidence rather than infer suitability — deferred:phase3-root-acceptance
- [b] Task: BLOCKED — Root-orchestrator fitness verification for Phase 4 using automated joins, Kimi WebBridge where applicable, and direct visual evidence (deferred:phase4-green)

## Phase 5: Independent acceptance

- [b] Task: Run full count, hash, path, caller, provenance, inspection, and disposition reconciliation — deferred:phase4-root-acceptance
- [b] Task: Spawn `fork_turns="none"` asset reviewers for every candidate disposition and substantive inspection record — deferred:phase4-root-acceptance
- [b] Task: Remediate every Critical, High, and Medium finding — deferred:phase4-independent-review
- [b] Task: Publish a non-consumable candidate manifest and complete review report; after root-orchestrator product-owner acceptance bound to their hashes, publish the accepted manifest — deferred:phase4-independent-review
- [b] Task: BLOCKED — Root-orchestrator final fitness acceptance using automated, Kimi WebBridge, independent LLM, and direct visual evidence (deferred:phase5-reviewed-candidate)
