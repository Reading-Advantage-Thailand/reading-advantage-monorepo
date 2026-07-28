# Existing Core Asset Migration Inventory

## Purpose and boundary

This inventory records the work required to replace original, app-local assets
for the Existing Core cohort with the accepted APK standard-pack release. It is
planning evidence only: it does not approve a legacy-to-new mapping, make a
candidate consumable, expose a production cartridge, or authorize retirement.

The target release is `2026.07.23` (catalog digest
`ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`).
Each cartridge must load only its resolver-produced selected union, carry the
required `Pixel art assets by ElvGames` credit, and never load a direct pack
path, a private pack, or the complete standard pack.

## Current state

- Original assets are still served by legacy Advantage Games and Reading
  implementations. They cannot be deleted yet.
- The only accepted forward bindings are the seven semantic role/state bindings
  in `packages/advantage-play-kit/src/assets/semantic-product-bindings.ts`.
- Task 3 approves **zero legacy asset mappings**. Its five title records are
  candidates (`consumable: false`), not replacement manifests.
- The current QC-only selected union contains seven physical files. It is not a
  production deployment output.
- Sorcerer's Ziggurat and Astral Mage are historical-source-only. Do not infer a
  current gameplay or asset replacement from their cover image or historical
  evidence.

## Accepted forward semantic bindings

| Role/state | Semantic key | Loader kind |
|---|---|---|
| `player:idle` | `top-down/32x32/characters/hero-01` | image |
| `enemy:idle` | `side-view/32x32/characters/enemy-001-idle` | image |
| `feedback:correct` | `effects/32x32/combat/hit-01` | image |
| `control:confirm` | `ui/16x16/controls/gamepad-buttons` | image |
| `panel:default` | `ui/20x20/inventory/slot` | image |
| `status:armor` | `ui/32x32/items/armor-icons` | image |
| `audio-feedback:correct` | `audio/native/combat/hit-01` | audio |

## Per-title migration inventory

| Title | Original asset surface requiring a manifest | Current candidate union | Missing mapping / decision |
|---|---|---|---|
| Dragon Flight | `apps/advantage-games/src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx` directly loads 11 gameplay files: gates, boss, two player sheets, dragon army, three parallax layers, loading background, and two projectiles. Equivalent Reading implementation and public tree are under `apps/reading-advantage/components/games/vocabulary/dragon-flight/` and `apps/reading-advantage/public/games/vocabulary/dragon-flight/`; Advantage Games has its own `public/games/vocabulary/dragon-flight/` and duplicate `public/games/dragon-flight/` trees. | player, correct-feedback, correct audio (3 keys) | Gates, boss, army, world/parallax, loading art, and both projectiles have no approved semantic mapping. Inventory exact consumers, dimensions, frames, and gameplay role before proposing bindings or new art. |
| Magic Defense | Original background, castle, and skeleton sheets are under `apps/advantage-games/public/games/magic-defense/`; Reading has corresponding `public/games/vocabulary/magic-defense/` files. `apps/advantage-games/src/components/games/game/Enemy.tsx` directly loads the skeleton sheet; all consumers must be enumerated. | panel, armor status, correct feedback, correct audio (4 keys) | Background, castle, and enemy replacement decisions are missing. `enemy:idle` is not part of this title's accepted candidate, so it may not be silently substituted. |
| Dungeon Liberator | `apps/advantage-games/src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx` directly loads background, player, prisoner, and slime sheets. Duplicates exist in `public/games/dungeon-liberator/` and `public/games/sentence/dungeon-liberator/`. | player, enemy, correct feedback, confirm control (4 keys) | Background and prisoner have no approved replacement. Player/enemy still need a per-file replacement disposition covering sprite layout, crop, animation, scale, and collision/readability. |
| Sorcerer's Ziggurat | Historical evidence and cover art exist, but no current gameplay implementation is accepted as a migration source. | player, correct feedback, confirm control (3 keys) | Blocked: obtain current, title-specific implementation and asset evidence before creating any original-to-new mapping or retirement list. |
| Astral Mage | Historical evidence and cover art exist, but no current gameplay implementation is accepted as a migration source. | player, correct feedback, correct audio (3 keys) | Blocked: obtain current, title-specific implementation and asset evidence before creating any original-to-new mapping or retirement list. |

## Required change set

1. Publish an immutable per-title legacy manifest. Every original file needs its
   path, checksum, app/host consumer, visual role, dimensions, frame/crop
   contract, audio metadata where applicable, and exact retirement candidate.
2. For every manifest row, obtain an owner-reviewed disposition: map it to an
   accepted semantic key, retain it temporarily with an explicit reason, or add
   a newly reviewed standard-pack asset/binding. Do not treat the seven forward
   bindings as a one-to-one legacy mapping.
3. Extend the canonical binding manifest only for approved roles/states, then
   materialize the per-title selected union through
   `createAcceptedSemanticAssetResolver`. Replace direct public URLs and
   app-local asset imports in the cartridge implementation with registrations
   from that union.
4. Preserve mechanic contracts while adapting asset dimensions, animation
   frames, crops, collision/readability, compact/wide composition, audio, and
   loading/error states. A visual substitution that changes gameplay is a
   mechanic change and needs separate evidence.
5. Wire the exact same pinned release, catalog digest, semantic binding manifest,
   selected union, and credit into Advantage Games, Reading, and Primary. Keep
   the production catalog and root loaders quarantined until Task 5 succeeds.
6. Add tests for manifest completeness, resolver selection, no direct legacy or
   physical-pack paths, selected-union-only output, credit display, asset
   dimensions/frames, compact/wide rendering, and real keyboard/pointer/touch
   behavior. Run both hosts' completion, tenant, idempotency, replay, and
   navigation proof.
7. After both host proofs and independent review, retire only rows with an exact
   approved replacement disposition. Add caller and asset guards that reject
   the retired path and prevent app-local copies from returning.

## Acceptance evidence still required

- Hash-bound legacy manifests and approved disposition matrix for all five
  titles.
- Selected-union manifests and resolver receipts for each title in all three
  hosts.
- Browser and automated proof for compact/wide layouts, supported inputs,
  loading failure behavior, credits, and educational-result invariants.
- Task 5 host-proof receipt; Task 6 retirement/caller/asset-guard evidence; and
  Task 7 independent review plus product-owner acceptance.

Until this evidence exists, the new pack remains a QC candidate and original
assets remain the authoritative deployed surface.
