# Implementation Plan: Existing Action Cutover

- [x] Verify the accepted crosswalk/readiness receipt and establish exact legacy manifests for the five titles. Independent audit `phase1-independent-audit-2026-07-31.md` found a High boundary bypass and Medium missing membership/tamper guards. Remediated in `e022e439f` (exact top-level+title schemas, native-boolean readiness flags, authority-injection tamper probes, Action/Special evidence-membership checks). Independently re-verified 2026-07-31: all 5 tests pass, all 5 evidence files hash-match, all 5 titles are true members of their cited evidence. Fail-closed authority, exact five-title membership, evidence lineage, and tamper guards confirmed. Content commits: `8370f6833`, `75ca086f5`, `e022e439f`.
- [b] Freeze each title's semantic roles, behavior descriptors, source manifests, and adoption decisions after current Asset Contract v2 reacceptance — deferred:apk-asset-contract-v2-reacceptance-owner.
- [b] Write deterministic mechanic and educational Red tests for each title — deferred:apk-asset-contract-v2-reacceptance-owner.
- [b] Revalidate current cartridges against T11 APIs and approved semantic bindings — deferred:apk-asset-contract-v2-reacceptance-owner.
- [b] Prove selected output, compact/wide behavior, and real input in Advantage Games QC — deferred:apk-asset-contract-v2-reacceptance-owner.
- [b] Prove the same cartridge, binding, and completion persistence in Reading and Primary — deferred:apk-reading-primary-host-proof-owner.
- [b] Retire exact replaced code and assets with graph/caller guards after both host proofs — deferred:apk-reading-primary-retirement-owner.
- [b] Obtain product-owner acceptance after independent review — deferred:apk-independent-review-owner.
