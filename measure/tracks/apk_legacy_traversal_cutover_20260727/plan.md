# Implementation Plan: Legacy Traversal Cutover

- [x] Confirm accepted crosswalk/readiness coverage and publish exact legacy manifests for five titles.
- [x] Consume accepted Asset Contract v2 and suitability/ingestion records; freeze each title's semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions before implementation.
- [x] Write failing mechanic, responsive composition, and educational-invariant tests per title.
- [x] Build each cartridge using current public APK APIs and approved semantic bindings.
- [x] Run Advantage Games QC with compact/wide, resize, input, and selected-output checks.
- [b] Run Reading and Primary host proofs for loading, authoritative completion, persistence, replay, and navigation. The 24-title candidate and its 193/193 reports are historical non-consumable evidence with live-source drift, not host proof. (deferred:apk_existing_core_cutover_20260727-dragon-flight-reference-acceptance)
- [b] Retire only exact proven legacy paths and validate callers, selected outputs, and copied-asset guards. The zero-deletion manifest is historical retention evidence, not Task-7 completion. (deferred:apk_existing_core_cutover_20260727-dragon-flight-reference-acceptance)
- [b] Obtain independent review and product-owner acceptance only after a title-specific production proof. The candidate handoff remains historical and non-consumable. (deferred:apk_existing_core_cutover_20260727-dragon-flight-reference-acceptance)

## Tasks 1–5 Evidence

### Audit remediation: Tasks 1–5 v2

- [x] Replace the provisional v1 evidence with accepted, per-title v2 dossiers, decision records, resolver-issued selected unions, and a bounded owner acceptance that authorizes only Advantage Games `/qc`.
- [x] Rebuild the five mechanics from cited source claims and prove compact/wide resize plus keyboard, pointer, and touch behavior in local Chromium.
- [x] Keep all Reading, Primary, production-catalog, persistence, migration, cutover, retirement, and deployment paths quarantined.

- `task1-source-readiness-manifest-v1.json` binds the accepted five-title crosswalk and each exact legacy source observation without granting reuse, ingestion, cutover, or release authority.
- `task2-canonical-suitability-dossiers-v2.json` persists the accepted five-title canonical decisions, source claim locators, descriptor dossiers, and exact selected unions. It corrects the Griffin Rider's Escape ledger binding to the complete `9269956e…bdd4dd59` SHA-256.
- `task2-owner-acceptance-v2.json` authorizes canonical selected-union inspection and claim-bound mechanics only in Advantage Games `/qc`. It blocks legacy reuse/ingestion and every production, Reading, Primary, persistence, migration, cutover, retirement, and deployment path.
- `legacy-traversal-cartridges.test.ts` and `legacy-traversal-qc.test.ts` cover source-bound Dragon timer/gate/boss sequencing; Spellweaver lane, fixed projection, spawn, and collection-zone rules; Shadow movement/chase/collision penalties; Labyrinth maze/goblin/aura transitions; and Griffin z-waves, perspective, and collision bands.
- `task5-advantage-games-qc-native-input-evidence-v2.json` binds the passing local Chromium proof: compact/wide resize with the same canvas node, native keyboard/pointer/touch input, title-scoped resolver unions, and zero host completion emissions for all five titles.
- Verified with `python3 -m unittest measure.tests.test_apk_legacy_traversal_cutover`, focused Vitest (18 tests), focused Jest, focused ESLint, and Chromium Playwright (2 tests). The package/app aggregate type gates remain blocked only by other in-flight Legacy Defense/Puzzle files; no traversal TypeScript diagnostic was reported. Reading/Primary host proofs, retirement, track-level independent review, final owner acceptance, and cutover remain explicitly pending.
