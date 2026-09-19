# Wizard and portfolio execution packet

## Scope and review status

The primary agent consolidates the portfolio agent's source findings in this packet.
The separate `portfolio.md` matrix covers all 28 current cartridge identities.
The final retained count and replacement identities remain product decisions.
Wizard vs. Zombie remains the first rebuild because the owner identifies it as a likely customer favorite.
No production code changed during this handoff.
The portfolio agent inspected six current assets; the primary agent also inspected the mage and enemy images.
No customer playtest or complete comparison of new candidate assets occurred during this planning work.

## Wizard source findings

`packages/game-cartridges/src/wizard-vs-zombie.ts` owns the current survival rules and scene.
`GRAVEYARD_FEATURES` defines crypts, graves, and fixed solid footprints.
`slidePosition` tries direct movement, horizontal movement, then vertical movement.
It keeps the previous position when all candidates intersect a solid.
This behavior provides collision sliding but does not provide route planning.

`spawnZombie` cycles through four fixed external entry positions.
`advance` moves each zombie directly toward the wizard through `velocityToward` and `slidePosition`.
For the centered starting wizard, those approach lines meet crypt or grave obstacles.
The source therefore indicates a risk of permanent trapping when the target remains aligned with an obstacle.
A behavioral simulation must establish the exact affected positions before reporting a reproduced gameplay failure.

`castShockwave` directly offsets nearby zombies away from the wizard.
The push does not pass through `slidePosition` or equivalent solid and bounds resolution.
The rebuilt ability must preserve separation from solids and valid world bounds.
The portfolio agent also identified missing visible shockwave and touch ability feedback as verification targets.
Verify the actual rendered scene before calling those visual findings confirmed.

## Required map behavior

Use one authored graveyard with connected courtyards and multiple escape routes.
Keep the player's location and intended movement clear at compact gameplay size.
Make obstacles constrain zombies and the wizard consistently.
Provide navigable routes around each major obstacle.
Keep required pickups reachable from the current player region.
Keep enemy and pickup spawns outside solid geometry.
Provide safe initial movement time before contact damage can occur.
Use narrow passages to support tactical positioning without permanent invulnerability.
Keep collision footprints aligned with visible terrain and props.
Keep selected words legible above terrain and character effects.

## First Wizard implementation batches

| Batch | Owned scope | Required output |
|---|---|---|
| W1: Baseline rules | Wizard controller tests and baseline fixtures | Preserve collection, wrong-answer consequences, healing, shockwave charging, and five-field completion. |
| W2: Map contracts | Focused APK map and navigation modules after existing primitive inspection | Define solids, navigation regions, spawn validity, pickup reachability, and collision-safe movement. |
| W3: Navigation | APK navigation tests and Wizard movement integration | Navigate actual entry routes, recover from blocked paths, and resolve knockback safely. |
| W4: Selected art | Wizard rendering and approved semantic bindings | Use Phase 1A assets with consistent scale, depth, animation, and collision alignment. |
| W5: Shared experience | Wizard integration with APK controls, screens, and audio | Complete reading and listening sessions through common entry, play, results, and replay. |
| W6: Play validation | Wizard browser tests and customer session notes | Establish device behavior, useful route decisions, and customer response. |

One agent owns Wizard source and tests during each batch.
Do not run map integration and listening integration against the same file concurrently.
Reuse existing collision primitives before introducing another physics or navigation framework.
Do not select a dependency before a bounded map implementation demonstrates the need.

## Behavioral tests

1. Preserve one validated result after successful and failed sessions.
2. Navigate each actual spawn approach around obstacles toward a stationary target.
3. Replan after the wizard changes courtyards.
4. Recover when a route becomes temporarily blocked.
5. Keep every required pickup reachable after correct and incorrect choices.
6. Reject spawns inside solids and unreachable regions.
7. Resolve shockwave pushes at walls, corners, and world bounds.
8. Preserve equal movement speed across diagonals and frame rates.
9. Release movement on pause, focus loss, and touch cancellation.
10. Show a visible, usable ability target on compact touch layouts.
11. Cancel old prompt audio when the learning target changes.
12. Keep speech readiness protection separate from collision immunity.
13. Preserve old host input and result compatibility.
14. Retry saving without granting duplicate rewards.

## New asset comparison targets

These are candidate collections, not final selections.
The planning handoff does not claim a complete visual comparison or current approval for every file.
The asset phase must inspect representative images and animations before assigning final semantic bindings.

| Role | Candidate source | Next evaluation |
|---|---|---|
| Graveyard and crypt terrain | `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/` | Inspect terrain continuity, crypt coverage, perspective, and obstacle footprints. |
| Alternative terrain | `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/` | Compare palette, map transitions, readability, and available props. |
| Additional props | `packages/advantage-play-kit/assets/standard/top-down/native/game-assets-extras/` | Compare only assets that match the selected terrain style and approved usage. |
| Existing review surface | `packages/advantage-play-kit/assets/review/rogue-adventure-world.html` | Use previews to shortlist actual files, then verify gameplay scale. |
| Crypt crop candidates | `packages/advantage-play-kit/assets/review/ra-crypt-review-parts-batch-proposed.cutlist.json` | Check review disposition; a proposed cutlist is not approval. |
| Shared UI families | UI candidate collections identified in `handoff-apk.md` | Compare complete frame and control families across entry, pause, and results. |
| Shockwave effects | Pixel VFX candidates identified in `handoff-apk.md` | Test radial visibility, contrast, duration, and speech overlap. |
| Music and feedback | Audio candidates identified in `handoff-listening.md` | Compare intelligibility beneath actual spoken prompts. |

The asset phase must record exact chosen actor, terrain, prop, effect, and UI files.
It must compare the best suitable new alternatives instead of accepting current bindings by default.
Retain older assets only with a specific compatibility or quality reason.

## Inspected baseline and new shortlist

The current materialized files reside in `apps/advantage-games/public/assets/apk/standard-pack-qc/`.
The primary agent corrected the materialized directory after checking the filesystem.

| Current file | Observed property |
|---|---|
| `asset-f11c375c7ba47fc0.png` | Small side-facing mage strip with six frames. |
| `asset-4ccca6ed296c77d4.png` | Large frontal armored skeleton figure. |
| `asset-2bd2454d7f15581b.png` | Brown top-down ground texture. |
| `asset-7c5e82a0799b849e.png` | Tombstone image containing multiple elements. |
| `asset-84663e69de1c831d.png` | Narrow blue-gray tower. |
| `asset-1a2d909a506fd6c9.png` | Cyan orb strip with eight frames. |

The mage and enemy differ in orientation, scale, and animation coverage.
Use this mismatch as a baseline problem for the new asset comparison.
Do not treat a larger or newer image as automatically better.

The named asset track records approved crypt, remastered Halloween, and dark-castle cut batches.
See `measure/tracks/apk_named_asset_cuts_20260907/plan.md`, including batches 6, 12, and 14.
Batch processing approval establishes availability; gameplay suitability still requires visual comparison.

The preliminary shortlist includes these collections:

- `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/processed/ra-crypt-review-parts/`
- `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/processed/remastered-halloween/`
- `packages/advantage-play-kit/assets/standard/top-down/native/farming-game-world/processed/fg-dark-castle-review-parts/`
- `packages/advantage-play-kit/assets/standard/top-down/native/fantasy-dreamland-world/characters/spritesheets/`
- `packages/advantage-play-kit/assets/standard/top-down/native/rogue-adventure-world/enemies/`

These new candidate collections were discovered but not visually compared during this handoff.
Verify each exact character sheet and its required movement directions before selection.
Compare the current baseline, a rogue crypt kit, and a Halloween or dark-castle kit.
Keep map geometry and enemy counts identical across visual comparisons.
Test compact 390×844 and wide 960×540 layouts.

## Portfolio coverage

The main catalog contains 28 identities and `portfolio.md` contains 28 disposition rows.
The matrix groups flight, escort, dungeon, shooter, platform, and sequencing overlaps.
It preserves distinct candidates such as territory capture, rune matching, potion service, and slime growth.
These are design hypotheses, not verified customer preference rankings.
Resolve replacement identities before removing links or implementations.
Preserve old result identifiers, rewards, and historical competition scopes.

## RPG and social dependencies

The current game completion path already separates display XP from authoritative host persistence.
Extend that path through validated backend operations rather than allowing cartridges to grant rewards.
Inspect existing mastery, identity, quest, and inventory modules before selecting new persistence ownership.
The portfolio agent found no confirmed shared inventory, cosmetic ownership, or quest primitive.
Existing local RPG stores and browser leaderboards cannot provide authoritative progression or rankings.
Existing multiplayer prototypes require authentication, message validation, reconnect handling, and reward reconciliation before production reuse.
Verify those boundaries independently during the later social implementation audit.
Phase 5 owns the detailed reuse audit and concrete reward rules.
Phase 6 owns comparable asynchronous challenges and class contributions.
Phase 7 owns live cooperation, reconnect behavior, authoritative state, and reward reconciliation.

## Customer validation

Observe whether students choose routes that delay zombies.
Record whether students understand why a path is blocked.
Compare collection accuracy with and without active pursuit.
Observe whether speech remains understandable during survival pressure.
Record control errors separately from language errors.
Compare voluntary replay with the existing favorite.
Do not declare the new map enjoyable from source tests or screenshots alone.
