# Dragon Flight Selected-Union Boundary Verification — 2026-08-02

## Status and scope

This is a bounded technical verification record for the Dragon Flight-only
corrective phase. It records the source-boundary correction that prevents the
two host applications from receiving a complete standard-pack catalog. It does
**not** mark Existing Core Task 5, the track, production, cutover, retirement,
a cohort, browser proof, or product-owner acceptance complete.

The earlier
[`dragon-flight-host-proof-ci-verification-2026-08-02.md`](./dragon-flight-host-proof-ci-verification-2026-08-02.md)
remains historical evidence for its server-owned dwell/browser run. It does
not bind the selection modules corrected here, so it cannot be reused as a
current browser proof for this source state.

## Corrected boundary

- Both server-only app selection modules now call only
  `getDragonFlightHostProofSelectedEdition()` from the public editions API.
- The public editions barrel and source module expose no
  `createDragonFlightHostProofEdition` catalog-taking factory and no
  `catalog.assets` path.
- The production getter constructs one cached immutable edition from exactly
  three literal selected records. It has no runtime catalog input.
- The package test verifies the actual public namespace and complete runtime
  file and binding metadata against the generated catalog: type, dimensions,
  format, alpha, view, digest, size, and provenance/credit fields.
- The Measure guard requires both app selection modules and both proof pages,
  then verifies their safe wiring. Deleting either module or page can no longer
  silently satisfy the guard.

## Source binding

The shared worktree contains independent parallel application work, so no
checkpoint commit was created for this record. This observed state is bound to
base commit `1d16956bbeb03f20b0117d7b0d8dadd6e64d3a17` plus these SHA-256
content fingerprints:

| File | SHA-256 |
| --- | --- |
| `packages/advantage-play-kit/src/editions/host-proof-edition.ts` | `171160492d1094dec62af2edfb4980cb02ede1b1b7800f1c233e8dabda194fd2` |
| `packages/advantage-play-kit/src/editions/host-proof-edition.test.ts` | `242fff905c5f430e2c13ccff989af27bb1fbd51be95e24608b9fa0e57d9ffbe9` |
| `packages/advantage-play-kit/src/editions/index.ts` | `02dc980caccd4c0249750354e14c97655309a0a8af0d5000579381a12eca5d35` |
| `apps/reading-advantage/lib/host-proof-selections.ts` | `207d81c0a9b9e427b1c43f546780a3b94a0bc0b9ab10bb8de0b86f52eba9c80a` |
| `apps/primary-advantage/lib/host-proof-selections.ts` | `207d81c0a9b9e427b1c43f546780a3b94a0bc0b9ab10bb8de0b86f52eba9c80a` |
| `apps/reading-advantage/app/[locale]/(host-proof)/student/host-proof/games/page.tsx` | `aaf31b011088c30d162f8b8f04143469c5be16b57116265c80053326a9ad9d34` |
| `apps/primary-advantage/app/[locale]/(host-proof)/student/host-proof/games/page.tsx` | `befd059b497005f7a003a1acebd2703f0456b5d0ff5edbf787114af9d2cf6d6f` |
| `apps/reading-advantage/__tests__/host-proof-bundle-isolation.test.ts` | `7e2061a5526e430d676556c6e13cdf1475ded85ccef6284828d201941b63381b` |
| `apps/primary-advantage/lib/__tests__/host-proof-bundle-isolation.test.ts` | `1844117144da94c14ab5b28038392d8031fba410c2392ca92577f02d926a8977` |
| `measure/tests/test_apk_existing_core_cutover_task5_host_proof_remediation.py` | `70d4a91e11156ee9b521ed1b122c06e6ae723fbf49e17adaa635efff1788afa8` |
| `measure/tests/test_apk_existing_core_dragon_flight_scope_quarantine.py` | `fc6ae121874918336a4e1e71d1fe73379dd975dc7fad152ffd2551243d0a05b0` |

## Focused verification

| Command | Result |
| --- | --- |
| `CI=true NODE_OPTIONS=--max-old-space-size=4096 ../../node_modules/.bin/vitest run src/editions/host-proof-edition.test.ts --maxWorkers=1 --no-file-parallelism --reporter=verbose` from `packages/advantage-play-kit` | 1 file, 2 tests passed |
| `python3 -m unittest measure.tests.test_apk_existing_core_task5_task6_acceptance measure.tests.test_apk_existing_core_cutover_task5_host_proof_evidence measure.tests.test_apk_existing_core_cutover_task5_host_proof_remediation measure.tests.test_apk_existing_core_dragon_flight_scope_quarantine` | 17 tests passed |
| `CI=true pnpm --filter reading-advantage test -- __tests__/host-proof-page.test.tsx __tests__/host-proof-game-client.test.tsx __tests__/host-proof-bundle-isolation.test.ts --runInBand` | 3 suites, 18 tests passed |
| `CI=true pnpm --filter primary-advantage exec vitest run lib/__tests__/host-proof-page.test.tsx components/host-proof/__tests__/HostProofGameClient.test.tsx lib/__tests__/host-proof-bundle-isolation.test.ts --reporter=verbose` | 3 files, 16 tests passed |
| `pnpm --filter @reading-advantage/advantage-play-kit build` | passed |
| Scoped `git diff --check` and forbidden-reference scans | clean; no catalog factory or `catalog.assets` production path, and neither app wrapper names `standard-pack-release.json` or the removed factory |

The added public-boundary assertion was first run Red: the public editions
namespace exposed `createDragonFlightHostProofEdition`. The implementation
then removed that obsolete API and its catalog-header-only validation path;
the focused verification above is the Green result.

## Independent implementation review

Sol independently re-reviewed this correction after the Green run and found no
Critical or High issue. That review accepts only the selected-union/public-API
repair: it confirms no public full-catalog constructor, no production
`catalog.assets` path, both app wrappers use only the safe getter, and the
updated Measure guard pins the intended boundary.

Terra independently assessed the corrected source as technically passing the
selected-union repair, with no Critical or High implementation finding. Its
review also confirmed both public manifests contain exactly the three selected
assets and their deployed file hashes match the manifests and selected-edition
metadata. Terra keeps the corrective phase on hold because those static/unit
checks do not prove a compiled Next host request on this changed source.

## Remaining formal gates

- Task 5 remains `[~]`; this record does not change plan or metadata status.
- Current-source Reading and Primary hostile and positive browser proof is now
  recorded in [`dragon-flight-host-proof-current-source-verification-2026-08-02.md`](./dragon-flight-host-proof-current-source-verification-2026-08-02.md).
  That later receipt binds the selection modules, pages, client/loaders, and
  materialized manifests; it remains bounded technical evidence only.
- A clean bounded checkpoint, refreshed phase review, Measure manual
  verification, and explicit product-owner authorization remain required.
- The full Reading TypeScript baseline remains ungreen as recorded in the plan.
- No later title, cohort, production exposure, deployment, cutover, or Task 6
  legacy retirement may consume this evidence.
