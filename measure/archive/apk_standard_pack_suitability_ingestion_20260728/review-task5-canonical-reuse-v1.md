# Independent suitability review — Existing Core Task 5 canonical reuse

**Track:** `apk_standard_pack_suitability_ingestion_20260728`
**Related track:** `apk_existing_core_cutover_20260727`
**Reviewed at:** `2026-07-31T13:30:00Z`
**Reviewer:** `independent-canonical-reuse-suitability-review`
**Disposition:** **Pass — exact canonical-reuse dossiers are eligible for a bounded owner decision.**

## Scope and authority boundary

This review covers only the five Existing Core title/role canonical-reuse dossiers,
their selected-union inputs, the accepted standard-pack source bytes, and the
additive Task-3 lineage receipt. It does not accept a legacy asset, authorize
ingestion, expose a catalog or loader, claim title adoption, delete a legacy path,
complete host proof, cut over a cartridge, deploy, or authorize production use.

## Recomputed source facts

- The exact accepted OGG source is stereo Vorbis at 48 kHz with a measured duration
  of `1.666667` seconds; the descriptor and evidence represent this as `1667 ms`.
- Image dimensions and native cell grids are exact: hero `192x384 / 32x32 / 6x12`,
  enemy `192x32 / 32x32 / 6x1`, hit effect `192x128 / 32x32 / 6x4`, controls
  `352x160 / 16x16 / 22x10`, inventory slot `20x20 / 20x20 / 1x1`, and armor
  `512x896 / 32x32 / 16x28`.
- The source packet establishes no named clip, timing, or direction semantics for
  the multi-cell atlases. The dossiers therefore bind measured geometry and empty
  clip/direction declarations rather than inventing row meanings or a full-image
  static claim.
- Collision envelopes are measured alpha unions per native cell and explicitly do
  not claim gameplay collision masks. Contrast is not source-independent without a
  reviewed presentation background; the descriptor uses the conservative floor of
  `1` instead of a fabricated contrast pass.
- The visually similar `192x32` side-view hero is rejected for the required
  `192x384` player-idle envelope; its measured minimum opaque height is `18`
  pixels.

## Hash-bound review inputs

| Input | SHA-256 |
| --- | --- |
| `packages/advantage-play-kit/src/assets/existing-core-suitability.ts` | `04468a604d5a7aaaa421e2df5f9b7e3b677fcb55a622cf81be4c67d8100a4c99` |
| `packages/advantage-play-kit/src/assets/existing-core-suitability.test.ts` | `ad028a1c070600e16d1c422327046bd51823dc972c3bf2dae4b35a7adce7b4cc` |
| `measure/tests/test_apk_existing_core_task5_canonical_reuse_suitability.py` | `13c32edbd6d706aa6d059c9678dd7ca4b1f651b4a272db597d158f7e5104414b` |
| `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py` | `aa5af84a6a393f082c95f3a134f7e142d8244817f876e526f7e584f9916c7424` |
| `measure/tests/test_apk_existing_core_cutover_task5_host_proof_evidence.py` | `9a82f582b6433c802ab08e34bcace711f281634c236ca2af7260c4a4e63714ce` |
| `measure/archive/apk_standard_pack_suitability_ingestion_20260728/task5-canonical-reuse-evidence-v1.json` | `a602d07e338327c04f5fcbb2a3cede179268aed963c0bc76292569db1eff1257` |
| `measure/archive/apk_existing_core_cutover_20260727/task5-canonical-reuse-dossiers-v1.json` | `da78c02003654ca777c5ac2486c1a8b04a380460fb51e258a9f4557b35d85c79` |
| `measure/archive/apk_existing_core_cutover_20260727/task5-canonical-reuse-disposition-matrix-v1.json` | `e6ac0a592840eff4d3664c23c5c11e70e404f0f787b419e9f6f9a3c066b86489` |
| `measure/archive/apk_existing_core_cutover_20260727/task3-current-lineage-receipt-v1.json` | `c5ccb0ac3b54474e2ad99badb2aef5c1608689e57559e2f26c6fb489a5513d7f` |
| `measure/archive/apk_existing_core_cutover_20260727/review-task3-current-lineage-v1.md` | `2042061ffe67246c56f47cd1c4639ec39e1bd4ec5156952e6b46415fff24a657` |
| `apps/primary-advantage/tests/e2e/host-proof-games.spec.ts` | `2f8191da34e4af508310cb2ffdf9c6b69f50f5d1ba101a039e3b448d1bbe9299` |

The historical Task-3 acceptance and accepted receipt remain bound to their
original hashes; the current lineage receipt is additive and does not replace
either historical byte set.

## Findings

No Critical, High, Medium, or Low findings remain in the reviewed canonical-reuse
package. The exact dossiers are eligible for owner approval only after the focused
asset tests, package typecheck/build/lint, and dedicated Measure guards pass. Any
owner decision must retain literal false production, ingestion, migration,
title-adoption, retirement, cutover, and deployment authorization.
