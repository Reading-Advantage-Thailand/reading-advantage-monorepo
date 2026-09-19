# Asset selection criteria

The owner requires the best suitable new APK assets.
Existing bindings do not determine the final selection.
The selection covers the full experience, including maps, actors, effects, UI, music, and sound.

## Required comparison

| Criterion | Evaluation |
|---|---|
| Gameplay readability | Identify the player, zombies, pickups, exits, and hazards at mobile gameplay size. |
| Visual coherence | Compare perspective, pixel density, outlines, palette, lighting, and animation style. |
| Map construction | Check corners, transitions, walls, paths, obstacles, entrances, and connected room coverage. |
| Movement and animation | Check required directions, movement, damage, attack, defeat, and effect states. |
| Collision alignment | Compare visible footprints with solids, navigation, depth order, and character occlusion. |
| Arcade presentation | Compare start frames, result frames, control icons, reward effects, and focus states. |
| Localization | Check Thai labels, long text, fallback fonts, and contrast at the smallest supported layout. |
| Runtime cost | Inspect texture loading, memory, atlas usage, frame stability, and reuse across games. |
| Audio clarity | Compare effects and music while prompts play; ensure speech remains intelligible. |
| Availability | Verify approval and permitted usage for the selected files and transformations. |

## Selection procedure

1. Inventory the new collections and available preview tools.
2. Inspect representative source images and animations.
3. Compare viable alternatives for each major role.
4. Assemble a coherent shortlist for the map and shared shell.
5. Test the shortlist in a small playable scene.
6. Inspect compact touch and wide keyboard layouts.
7. Record selected files and rejected alternatives in one table.
8. Present the playable comparison at phase verification.

Use actual asset paths and observed properties in the selection table.
Separate verified properties from assumptions and missing information.
Do not generate replacement artwork before checking the new collections.
Do not enlarge audit manifests or add hashes for this comparison.
Do not assume a reviewed crop represents approval for every source pack asset.

## Acceptance examples

The wizard remains visible beside crypt walls and in crowded encounters.
Zombies visibly walk around the same obstacles that constrain the wizard.
Word pickups remain readable over every selected terrain surface.
The start and end screens clearly belong to the same arcade as the game.
Speech remains intelligible during the selected music and effects.
An older retained asset has a specific reason when a suitable new candidate exists.

## Initial comparison set

Use the inspected baseline and discovered candidates in `handoff-portfolio.md`.
Start with rogue crypt, remastered Halloween, and dark-castle environments.
Compare compatible top-down player and enemy sheets within each kit.
Keep map geometry and enemy counts constant during the comparison.
The shortlist remains provisional until actual gameplay inspection.


## Labyrinth candidate review — 2026-09-09

The asset subagent inspected these source images. Final scene selection remains pending.

| Role | Candidate | Finding |
|---|---|---|
| Floor | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-floor-1-2.png` | Quiet brown 16×16 tile. Suitable for a crypt maze floor. |
| Wall | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-wall-top-0-4-2.png` | Horizontal 16×16 wall sample. Corners and junctions still need review. |
| Wall reference | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-wall-inner-0.png` | Coherent 48×64 enclosure. It cannot supply every maze connection alone. |
| Player | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/characters/spritesheets/fdr-character-016-complete-source-7ca53479ef51.png` | Top-down humanoid. The 128×416 sheet uses 32×32 cells. Gameplay scale and frame roles remain unverified. |
| Goblin | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/enemies/enemy011/enemy-011-a-source-8cb7e3d30a3a.png` | Green pointed-hat creature. The 192×224 sheet uses 32×32 cells. Four-direction movement remains unverified. |

The current side-view paladin and beast do not satisfy the requested top-down presentation.
The existing furniture strip does not provide a maze floor.

The Rogue Adventure license receipt is `packages/advantage-play-kit/assets/standard/licenses/rogue-adventure-world/license-source-63da3a2990bc.txt`.
The Fantasy Dreamland license receipt is `packages/advantage-play-kit/assets/standard/licenses/fantasy-dreamland-world/license-source-626bc5e1cdba.txt`.
The subagent reported commercial use and modification permissions with required ElvGames credit.
The receipts prohibit resale and AI training use.
The crypt cut approval record is `measure/tracks/apk_named_asset_cuts_20260907/batch-12-review.md`.
These findings support further scene review. They do not establish final product acceptance.


## Tower facade — 2026-09-09

Selected source: `top-down/native/fantasy-dreamland-world/processed/remastered-castle/remastered-castle-blue-narrow-wall.png`.
The 32 by 64 pixel image depicts a castle facade. The import receipt traces it to the ElvGames castle sheet.
It replaces the platform-strip appearance in Storm Castle Tower. It repeats only inside the tower bounds.
The native review found low Thai prompt contrast. A quiet header corrected that contrast.
The required physical record and three unchanged host copies now exist. No general release manifest was rewritten.

## Abyssal Well shortlist — 2026-09-09

Selected central source: `top-down/native/farming-game-world/processed/fg-abandoned-mines-review-parts/fg-abandoned-mines-review-parts-pit-round-black.png`.
The 48 by 96 pixel image depicts a mine shaft. It suits a small central opening, not the full circular playfield.
The source receipt identifies the ElvGames abandoned-mines sheet.
The scene will reuse the inspected crypt floor and top-down Wizard actor records.
Native scale, occlusion, enemy association, and word readability remain unverified.
