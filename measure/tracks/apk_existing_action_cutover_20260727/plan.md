# Implementation Plan: Existing Action Cutover

- [x] Verify the accepted crosswalk/readiness receipt and establish exact legacy manifests for the five titles. Evidence: task1-source-readiness-manifest-v1.json is archive-aware and binds the accepted active receipt, the 27/29 crosswalk, the identity ledger, and accepted source-evidence manifests to SHA-256 values. measure/tests/test_apk_existing_action_cutover_source_readiness.py recomputes every bound digest; enforces the exact five-title roster, source identities, crosswalk pointers, and ledger locators; and fails closed if any adoption, implementation, host-proof, retirement, cutover, or release authority is claimed. Content commit: 8370f6833.
- [ ] Consume accepted Asset Contract v2 and suitability/ingestion records; freeze each title's semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions before implementation.
- [ ] Write deterministic mechanic and educational Red tests per title.
- [ ] Revalidate current cartridges against T11 public APIs and approved semantic bindings.
- [ ] Prove selected-output, compact/wide, and real-input behavior in Advantage Games QC.
- [ ] Prove the same cartridge/binding in Reading and Primary, including authoritative completion persistence.
- [ ] Retire exact replaced code/assets only after both host proofs; update graph/caller guards.
- [ ] Run independent review and obtain product-owner acceptance.
