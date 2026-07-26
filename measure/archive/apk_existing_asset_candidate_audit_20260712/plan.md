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

- [x] Task: Inspect every candidate or justified identical-hash group; record each path (phase3-root-acceptance.json)
- [x] Task: Record visible/audible content, state/direction coverage, baked text/UI, placeholder, and corruption risks (phase3-root-acceptance.json)
- [x] Task: Preserve contact sheets/audio playlists only as navigation evidence (phase3-root-acceptance.json)
- [x] Task: Reconcile every inspection receipt to candidate rows (phase3-root-acceptance.json)
- [x] Task: Root-orchestrator fitness verification for Phase 3 using direct asset inspection and independent evidence (phase3-root-acceptance.json)

## Phase 4: Responsive legacy-function and replacement join

- [x] Task: Join candidates to accepted concrete scene usages from pilot and cohort manifests (phase4-root-acceptance.json)
- [x] Task: Record compact/wide, text-capacity, focal/crop/tile/slice, state, collision/readability, and current legacy-function evidence (phase4-root-acceptance.json)
- [x] Task: Record semantic-role/state replacement or retirement evidence; direct legacy paths remain evidence only and never become canonical standard-pack candidate keys (phase4-root-acceptance.json)
- [x] Task: Stop on missing scene-usage evidence rather than infer suitability (phase4-root-acceptance.json)
- [x] Task: Root-orchestrator fitness verification for Phase 4 using automated joins, Kimi WebBridge where applicable, and direct visual evidence (phase4-root-acceptance.json)

## Phase 5: Independent acceptance

- [x] Task: Run full count, hash, path, caller, provenance, inspection, and disposition reconciliation (`phase5-contract-test-report.json`; production pass, 19/19 counterexamples)
- [x] Task: Spawn `fork_turns="none"` asset reviewers for every candidate disposition and substantive inspection record (`phase5-reviews/AF-01-AF-06-v2.json`; `phase5-reviews/AF-07-AF-12-v2.json`)
- [x] Task: Remediate every Critical, High, and Medium finding (three frozen ledgers restored; 4,279/4,279 recursive locator pairs resolve; both v2 reviews clean)
- [x] Task: Publish the accepted manifest after the delegated root product-owner decision (`phase5-owner-approval-event-v1.json`; `phase5-accepted-manifest-v1.json`)
- [x] Task: Root-orchestrator final fitness acceptance using automated, Kimi WebBridge, independent LLM, direct visual evidence, and the governing delegated-owner event (`phase5-root-acceptance.json`; `phase5-acceptance-green-report.json`)
