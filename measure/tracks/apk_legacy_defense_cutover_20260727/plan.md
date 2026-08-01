# Implementation Plan: Legacy Defense Cutover

- [x] Verify the accepted crosswalk/readiness receipt and freeze exact legacy manifests for all four titles. (Content `ac6b8c0ea`; High remediations `8aaede640`, `e52df4aba`; fresh independent acceptance `phase1-independent-review-2026-07-31.md`; focused unittest 5/5.)
- [x] Remediate Task 2 audit: persisted 5 accepted v2 descriptors and 16 owner-accepted title-role dossiers with provenance, license, credit, selected-union, and artifact-hash reconciliation; legacy art remains blocked. (`python3 -m unittest measure.tests.test_apk_legacy_defense_cutover`; focused Vitest 13/13.)
- [x] Remediate Task 3 audit: bound Castle, Wizard, and Village mechanics to exact claim IDs and locators; Storm current-absence and historical claims fail closed. (Focused Vitest 13/13.)
- [x] Remediate Task 4 audit: removed all callback/result-delivery seams from the four Defense cartridges and retained an Advantage Games QC-only lifecycle. (Static guard + focused Vitest 13/13.)
- [x] Remediate Task 5 audit: registered exactly the Defense cohort at Advantage Games `/qc`; Chromium proved keyboard, pointer, touch, compact, and wide interactions. (`PLAYWRIGHT_PORT=3200 PORT=3200 pnpm --filter vocabulary-games exec playwright test tests/e2e/qc/legacy-defense-cartridges.spec.ts --project=chromium --timeout=120000`, 2/2.)
- [ ] Prove Reading and Primary loading, completion, persistence, replay, and navigation with the same binding.
- [ ] Delete exact replaced legacy code/assets after both host proofs and verify graph callers and no-copy guards.
- [ ] Complete independent review and product-owner acceptance.
