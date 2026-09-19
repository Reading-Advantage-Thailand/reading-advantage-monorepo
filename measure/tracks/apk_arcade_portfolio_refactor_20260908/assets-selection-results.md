# Wizard vs. Zombie Asset Selection Results

## Decision

Use the Rogue Adventure crypt family as the Wizard map art direction.

Use FDR character 009 as the player. Use Rogue enemy 023 as the zombie family.

The blue-robed player preserves the wizard identity. The skeleton family preserves a clear undead enemy identity.

Retain the current cyan orb strip as the pickup baseline. Add its animation during the Wizard scene work.

The first implementation used the existing APK interface shell.
The original bounded review found no approved image-based interface family with clear compact value.
The 2026-09-09 follow-up selected and implemented a blue common-screen pilot.
The final product binding still needs owner acceptance.

The local comparison is [asset-comparison.html](./asset-comparison.html).

## Review scope

The review inspected twelve representative new files. It also used the six current files inspected during the source audit.

The review did not inspect every source sheet. It compared enough files to select one coherent implementation direction.

## Recommended semantic roles

| Semantic role | Exact source path | Inspection result | Approval state |
| --- | --- | --- | --- |
| `world:ground` | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-floor-1-2.png` | Inspected. The 16×16 brown floor supports quiet text contrast. | Named-cut batch 12 approved. Product binding pending. |
| `prop:grave` | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-stone-tombstone-2-1.png` | Inspected. The 16×32 tombstone has a clear top-down footprint. | Named-cut batch 12 approved. Product binding pending. |
| `prop:gate` | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-gate-3-1.png` | Inspected. The 16×16 cut needs neighboring wall pieces for a complete gate. | Named-cut batch 12 approved. Product binding pending. |
| `prop:crypt-effect` | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/ra-crypt-review-parts-moss-tomb-animation-640.png` | Inspected. The 64×32 strip supplies four readable 16×32 frames. | Named-cut batch 12 approved. Product binding pending. |
| `player:idle` and movement | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/characters/spritesheets/fdr-character-009-complete-source-71dc19e0b6fd.png` | Inspected. The 128×416 sheet has blue robes, white hair, four directions, and several action rows. | Pack release accepted. Phase 1A selected. |
| `enemy:idle` and movement | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/enemies/enemy023/enemy-023-a-source-bbf3d938f27f.png` | Inspected. The 288×288 sheet has directional skeleton movement, attacks, damage, and death effects. | Pack release accepted. Phase 1A selected. |
| `prop:orb` | `apps/advantage-games/public/assets/apk/standard-pack-qc/asset-1a2d909a506fd6c9.png` | Inspected. The 128×16 cyan strip has eight clear frames. | Current accepted binding. |
| Ability and status interface | Existing APK interface primitives | Text and CSS preserve compact clarity and reduce texture requests. | Existing product system. |

The player uses a youthful caster silhouette without a pointed hat. Confirm the wizard identity during the playable scene review.

The enemy uses a skeleton instead of a decayed human zombie. The existing game already uses a skeleton for the zombie role.

## Inspected alternatives

| Candidate | Exact source path | Result |
| --- | --- | --- |
| Halloween tree | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/processed/remastered-halloween/remastered-halloween-large-bare-tree-64-0.png` | The 48×64 tree has a strong landmark silhouette. Its warm palette competes with the crypt family. |
| Halloween memorial | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/processed/remastered-halloween/remastered-halloween-gray-cross-floor-panel.png` | The 48×32 memorial reads clearly. Its light values reduce label contrast nearby. |
| Dark-castle wall | `packages/advantage-play-kit/assets/standard/top-down/native/farming-game-world/processed/fg-dark-castle-review-parts/fg-dark-castle-review-parts-wall-rounded-tall.png` | The 48×64 wall provides a strong boundary. Its red palette conflicts with the brown crypt floor. |
| Dark-castle flame | `packages/advantage-play-kit/assets/standard/top-down/native/farming-game-world/processed/fg-dark-castle-review-parts/fg-dark-castle-review-parts-flame-pedestal-animation-400.png` | The 128×32 strip provides eight animated frames. Frequent flames could distract from vocabulary prompts. |
| FDR character 012 | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/characters/spritesheets/fdr-character-012-complete-source-495b1491603a.png` | The 128×416 sheet has complete movement and actions. The feline silhouette does not fit the current Wizard identity. |
| Rogue enemy 010 | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/enemies/enemy010/enemy-010-a-source-dd645a61cb66.png` | The 192×224 sheet has full movement and effects. The bright green beast does not read as a zombie. |

Remastered Halloween belongs to approved named-cut batch 6. Rogue crypt belongs to approved batch 12.

Dark castle belongs to approved named-cut batch 14. These approvals cover the cuts, not the proposed product roles.

## Current baseline findings

The current mage uses `asset-f11c375c7ba47fc0.png`. Its 192×32 strip has six side-facing frames.

The current enemy uses `asset-4ccca6ed296c77d4.png`. Its single 128×128 frontal figure has no movement coverage.

The current brown ground remains coherent. The current grave image contains several visual elements within one 48×64 file.

The current actor orientation and scale do not match.
The selected runtime sheets use 24-pixel player cells and 48-pixel enemy cells.
The scene preserves each sprite's proportions and aligns its feet with the collision position.

## Comparison result

| Criterion | Current baseline | Rogue crypt recommendation | Halloween and dark-castle comparison |
| --- | --- | --- | --- |
| Map coherence | Mixed grave, tower, and brown texture | One crypt family supplies floor, graves, gates, walls, and effects | Two families create a mixed palette |
| Orientation | Side-facing player and frontal enemy | Both actor sheets provide top-down directions | Actors fit, but terrain families disagree |
| Pixel scale | Actor sizes disagree | 16-pixel terrain, 24-pixel player cells, and 48-pixel enemy cells preserve their proportions | 48-pixel props dominate small routes |
| Animation | Mage has six frames; enemy is static | Player and enemy have several directional rows | Terrain adds effects but does not improve actor identity |
| Player readability | Mage identity is clear; movement direction is weak | Blue robes and white hair preserve a caster silhouette | Same actor selection can support the alternate map |
| Enemy readability | Undead identity is clear; motion is weak | The animated skeleton preserves a clear undead silhouette | Bright beast conflicts with the undead theme |
| Mobile performance | Few textures and limited animation | Small cuts and bounded animations support mobile use | Large props and several effects increase overdraw |
| Approval | Current roles accepted | Cuts accepted; new roles need approval | Cuts accepted; new roles need approval |

## Required playable confirmation

Build one static map slice with the recommended files. Use the final collision geometry.

Show the slice at 390×844 and 960×540. Keep vocabulary labels visible during movement.

Animate four movement directions, the crypt tomb, and the orb. Show 50 enemies during a short stress run.

Confirm a stable pixel scale before binding changes. Confirm the required ElvGames credit in the product surface.

Apply semantic binding changes during the bounded Wizard implementation. Preserve the selected exact source paths.

## Remaining gaps

- Character 009 needs a wizard identity check during motion.
- Enemy 023 uses a skeleton interpretation of the zombie role.
- The gate cut needs adjacent wall pieces before map use.
- The original bounded review did not approve an image-based interface family. The dated follow-up now supplies a pilot candidate.
- Decode cost and frame timing need a browser build.
- Compact label contrast needs a playable scene.

## Runtime verification correction

The complete wizard sheet contains different cell sizes for movement and attacks.
The first browser run exposed a clipped wizard with a uniform 32-pixel grid.
The implementation uses the matching dedicated walking sheet instead.

Source: `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/fantasy-dreamland-reborn/characters/fdr-character-009-walk-source-57fff2d7a6ee.png`.

This sheet has four columns and four rows of 24-pixel cells.
The undead sheet has six columns and six rows of 48-pixel cells.
The complete wizard sheet remains a comparison source, not a uniform runtime animation sheet.

Six selected files now exist in each host public asset directory.
The public preview uses the catalog edition and preserves local-only results.
Playable map verification remains in progress.

## Interface follow-up — 2026-09-09

This review inspected all four Pixelart GUI Kit interface groups at enlarged integer scale.
It also inspected all four 336-icon groups and enlarged the strongest action icons.

The blue `user-interface-02` group best matches the current navy and cyan APK shell.
Its bright edges remain clear on the briefing and results surfaces.
The orange group has stronger contrast, but it conflicts with the current cyan identity.
The gray and brown groups lack a complete button, frame, and health set.

Use this candidate group for one common-screen visual pilot:

| Role | Exact source path | Native size | Use rule |
| --- | --- | --- | --- |
| Primary button | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/user-interface-02/button-big-02-source-637e78d0f1a8.png` | 48×16 | Use a horizontal slice. Preserve the end caps. Keep the HTML button at least 48 pixels high. |
| Secondary button | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/user-interface-02/button-big-01-source-b91cdc260513.png` | 48×16 | Use a horizontal slice. Keep the center available for localized text. |
| Square panel frame | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/user-interface-02/inventory-9slices-02-source-4d21c6604de9.png` | 48×48 | Use a nine-slice frame. Do not stretch the complete image. |
| Octagonal status frame | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/user-interface-02/inventory-9slices-01-source-561077038e95.png` | 48×48 | Use for one short result or status value. Do not use it for paragraph text. |
| Segmented health frame | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/user-interface-02/health-bar-02-source-88abda4cf109.png` | 64×16 | Use only for health. At 3× scale, it occupies 192×48 pixels. |

The dark blue `icons-style-4` group supplies the closest matching action icons.
Each source is 32×32 pixels and includes its own square frame.
Render each icon at 48×48 or 64×64 with nearest-neighbor scaling.

| Action | Exact source path | Native size | Inspection result |
| --- | --- | --- | --- |
| Return to games | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/icons-style-4/style-4-icon-288-source-bc1b9534b053.png` | 32×32 | The home shape is clear at 48 pixels. Keep the visible text label. |
| Play audio | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/icons-style-4/style-4-icon-290-source-1539c4c346d5.png` | 32×32 | The speaker and sound marks remain distinct at 48 pixels. |
| Muted audio | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/icons-style-4/style-4-icon-292-source-146ad2e14469.png` | 32×32 | The speaker and cross remain distinct at 48 pixels. |
| Confirmed result | `packages/advantage-play-kit/assets/standard/ui/native/rogue-adventure-world/pixelart-gui-kit/icons-style-4/style-4-icon-324-source-8d53f791d540.png` | 32×32 | The check mark is clear at 48 pixels. Use it with result text. |

The assets can improve the arcade identity without replacing accessible text.
The button images require sliced rendering because localized labels need flexible widths.
The icon frames consume much of each 32-pixel source, so smaller rendering reduces glyph clarity.

This follow-up selects a pilot candidate only.
The common briefing and results screens need compact and wide visual review before a product binding.
