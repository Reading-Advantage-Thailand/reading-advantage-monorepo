# Implementation Plan: Existing Action Cutover

- [x] Verify the accepted crosswalk/readiness receipt and establish exact legacy manifests for the five titles. Independent audit `phase1-independent-audit-2026-07-31.md` found a High boundary bypass and Medium missing membership/tamper guards. Remediated in `e022e439f` (exact top-level+title schemas, native-boolean readiness flags, authority-injection tamper probes, Action/Special evidence-membership checks). Independently re-verified 2026-07-31: all 5 tests pass, all 5 evidence files hash-match, all 5 titles are true members of their cited evidence. Fail-closed authority, exact five-title membership, evidence lineage, and tamper guards confirmed. Content commits: `8370f6833`, `75ca086f5`, `e022e439f`.
- [ ] Consume accepted Asset Contract v2 and suitability/ingestion records; freeze each title's semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions before implementation.
- [ ] Write deterministic mechanic and educational Red tests per title.
- [ ] Revalidate current cartridges against T11 public APIs and approved semantic bindings.
- [ ] Prove selected-output, compact/wide, and real-input behavior in Advantage Games QC.
- [ ] Prove the same cartridge/binding in Reading and Primary, including authoritative completion persistence.
- [ ] Retire exact replaced code/assets only after both host proofs; update graph/caller guards.
- [ ] Run independent review and obtain product-owner acceptance.
