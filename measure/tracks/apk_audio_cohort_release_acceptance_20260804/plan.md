# Plan: APK Audio Cohort Release Acceptance

Track: `apk_audio_cohort_release_acceptance_20260804`
Digest table (old → new) is in `spec.md` and must be reproduced in commit bodies.

## Phase 1: Commit the audio import evidence

- [ ] Commit the 241 OGG files, `IMPORT-RECEIPT.tsv`, `standard-pack-release.json`,
      and the already-green `standard-asset-library.test.ts` as one atomic
      `feat(apk): import sound effects audio cohort (track_id: apk_audio_cohort_release_acceptance_20260804)`
      commit. Pathspec staging only (shared index).
- [ ] Evidence: `node scripts/verify-standard-pack-parity.mjs` output captured
      into the commit body or a track receipt.

## Phase 2: Red — pin the new release identity in tests

- [ ] Update the six test files with old-release fixtures/literals to expect
      `2026.08.04` + new digests (Red: they fail against the un-updated
      constants): `accepted-inputs.test.ts`, `capability-manifest.test.ts`,
      `asset-contract-v2.test.ts`, `standard-pack-suitability.test.ts`,
      `cartridge-manifest.test.ts`, `standard-pack-release.integration.test.ts`
      (43_075 → 43_316), `standard-pack-acceptance.integration.test.ts`
      (acceptedAt), `standard-asset-gallery.test.tsx` (version literal).
- [ ] Commit as `test(apk): ... (track_id: ...)`.

## Phase 3: Green — advance the constants

- [ ] `accepted-standard-pack-release.ts`: version, three digests, assetCount,
      acceptedAt `2026-08-04`.
- [ ] `capability-manifest.ts` (literal type + constants), `scaffolding/exemplar.ts`,
      `editions/host-proof-edition.ts`, `guards/accepted-inputs.ts`,
      `guards/legacy-edition-policy.ts`, `compatibility/developer-kit-api.ts`
      — only if grep shows old-release pins (Claude-surveyed line refs in
      session log; re-verify by grep).
- [ ] Scoped vitest run (13 files enumerated in session log) green.
- [ ] Commit as `feat(apk): accept standard-pack release 2026.08.04 (audio cohort) (track_id: ...)`.

## Phase 4: Suitability evidence pins + closeout

- [ ] `existing-core-suitability.ts` CATALOG_SHA256 + IMPORT_RECEIPT_SHA256;
      `existing-action-suitability.ts` and `legacy-defense-suitability.ts`
      CATALOG_SHA256 only. Recompute from worktree files; do not trust this plan's
      literals blindly.
- [ ] Their scoped tests green; parity script output attached to a closeout
      receipt `release-acceptance-receipt-20260804.md` in this track dir.
- [ ] Commit `feat(apk): advance suitability evidence pins to release 2026.08.04 (track_id: ...)`.
- [ ] Register track in `measure/tracks.md`; close with status complete.
