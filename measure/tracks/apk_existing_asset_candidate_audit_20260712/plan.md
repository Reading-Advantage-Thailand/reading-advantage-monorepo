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

- [~] Task: Inspect sidecars, repository history, approved authoring sources, and licenses per candidate/group
- [ ] Task: Record exact provenance evidence or explicit unknown status
- [ ] Task: Prove unknown provenance cannot receive reuse/adapt disposition
- [ ] Task: Run independent provenance review
- [b] Task: Root-orchestrator fitness verification for Phase 2 using automated and independent evidence (deferred:phase2-green)

## Phase 3: Candidate-level visual and audio inspection

- [ ] Task: Inspect every candidate or justified identical-hash group; record each path
- [ ] Task: Record visible/audible content, state/direction coverage, baked text/UI, placeholder, and corruption risks
- [ ] Task: Preserve contact sheets/audio playlists only as navigation evidence
- [ ] Task: Reconcile every inspection receipt to candidate rows
- [b] Task: Root-orchestrator fitness verification for Phase 3 using direct asset inspection and independent evidence (deferred:phase3-green)

## Phase 4: Responsive/theme suitability join

- [ ] Task: Join candidates to accepted concrete scene usages from pilot and cohort manifests
- [ ] Task: Record compact/wide, text-capacity, focal/crop/tile/slice, state, and collision/readability suitability
- [ ] Task: Record separate `cute_chibi_v1` and original `heroic_stylized_v1` suitability without treating style as gameplay meaning
- [ ] Task: Stop on missing scene-usage evidence rather than infer suitability
- [b] Task: Root-orchestrator fitness verification for Phase 4 using automated joins, Kimi WebBridge where applicable, and direct visual evidence (deferred:phase4-green)

## Phase 5: Independent acceptance

- [ ] Task: Run full count, hash, path, caller, provenance, inspection, and disposition reconciliation
- [ ] Task: Spawn `fork_turns="none"` asset reviewers for every candidate disposition and substantive inspection record
- [ ] Task: Remediate every Critical, High, and Medium finding
- [ ] Task: Publish a non-consumable candidate manifest and complete review report; after root-orchestrator product-owner acceptance bound to their hashes, publish the accepted manifest
- [b] Task: Root-orchestrator final fitness acceptance using automated, Kimi WebBridge, independent LLM, and direct visual evidence (deferred:phase5-reviewed-candidate)
