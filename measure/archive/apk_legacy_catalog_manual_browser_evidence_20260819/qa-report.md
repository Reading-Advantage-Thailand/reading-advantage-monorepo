# APK Legacy Catalog Manual Browser QA Report

**Date:** 2026-08-19  
**Captured route:** Public preview at `/en/student/arcade/{id}`  
**Live catalog route:** Authenticated APK at `/en/student/games/apk/{id}`  
**Tester:** OpenCode browser operator  
**Overall verdict:** Fail

## Scope Correction

The 40 screenshots prove public preview rendering only. Live catalog cards do not open the preview route.

The cards open the authenticated APK route. A signed-out launch shows `Authentication required` instead of a game.

The preview uses fixed sample content and does not save progress. Therefore, this evidence cannot certify the real catalog launch flow.

Source evidence:

- [UX wiring executive summary](../../audit-reports/advantage-games-ux-wiring_20260819/executive-summary.md)
- [Shared route and host findings](../../audit-reports/advantage-games-ux-wiring_20260819/shared-layer.md)
- [Title findings](../../audit-reports/advantage-games-ux-wiring_20260819/findings.md)
- [Asset deep pass](../../audit-reports/advantage-games-ux-wiring_20260819/assets.md)

## Capture Checks

`capture-observations.json` contains 40 records. It contains 20 compact records and 20 wide records.

Every record has one canvas, no captured console error, no visible error text, and no horizontal document overflow.

The workflow sent at least one keyboard action during scored play. This confirms event delivery without proving the promised mechanic.

## Verdicts

`Input: Pass` means the action reached the active page without an error. It does not override a mechanic or tutorial failure.

| Cartridge | Compact | Wide | Input | Console | Evidence |
|---|---|---|---|---|---|
| Castle Defense | Fail: S2, C01 | Fail: S2, C01 | Pass | Pass | [Compact](evidence/compact/castle-defense.png), [Wide](evidence/wide/castle-defense.png) |
| Magic Defense | Fail: S2, C02 | Fail: S2, C02 | Pass | Pass | [Compact](evidence/compact/magic-defense.png), [Wide](evidence/wide/magic-defense.png) |
| RPG Battle | Fail: S2, C03 | Fail: S2, C03 | Pass | Pass | [Compact](evidence/compact/rpg-battle.png), [Wide](evidence/wide/rpg-battle.png) |
| Wizard vs Zombie | Fail: S2, C04 | Fail: S2, C04 | Pass | Pass | [Compact](evidence/compact/wizard-vs-zombie.png), [Wide](evidence/wide/wizard-vs-zombie.png) |
| Enchanted Library | Fail: S2, C05 | Fail: S2, C05 | Pass | Pass | [Compact](evidence/compact/enchanted-library.png), [Wide](evidence/wide/enchanted-library.png) |
| Rune Match | Fail: S2, C06 | Fail: S2, C06 | Pass | Pass | [Compact](evidence/compact/rune-match.png), [Wide](evidence/wide/rune-match.png) |
| Alchemist's Synthesis | Fail: S2, C07 | Fail: S2, C07 | Pass | Pass | [Compact](evidence/compact/alchemists-synthesis.png), [Wide](evidence/wide/alchemists-synthesis.png) |
| Potion Rush | Fail: S2, C08, V01 | Fail: S2, C08, V01 | Pass | Pass | [Compact](evidence/compact/potion-rush.png), [Wide](evidence/wide/potion-rush.png) |
| Dungeon Liberator | Fail: S2, C09 | Fail: S2, C09 | Pass | Pass | [Compact](evidence/compact/dungeon-liberator.png), [Wide](evidence/wide/dungeon-liberator.png) |
| Rune Forge Chamber | Fail: S2, C10 | Fail: S2, C10 | Pass | Pass | [Compact](evidence/compact/rune-forge-chamber.png), [Wide](evidence/wide/rune-forge-chamber.png) |
| Village Guardian | Fail: S2, C11 | Fail: S2, C11 | Pass | Pass | [Compact](evidence/compact/village-guardian.png), [Wide](evidence/wide/village-guardian.png) |
| The Abyssal Well | Fail: S2, C12 | Fail: S2, C12 | Pass | Pass | [Compact](evidence/compact/abyssal-well.png), [Wide](evidence/wide/abyssal-well.png) |
| Archer's Revenge | Fail: S2, C13 | Fail: S2, C13 | Pass | Pass | [Compact](evidence/compact/archers-revenge.png), [Wide](evidence/wide/archers-revenge.png) |
| Storm the Castle Tower | Fail: S2, C14 | Fail: S2, C14 | Pass | Pass | [Compact](evidence/compact/storm-castle-tower.png), [Wide](evidence/wide/storm-castle-tower.png) |
| Griffin Sky-Joust | Fail: S2, C15, V02 | Fail: S2, C15, V02 | Pass | Pass | [Compact](evidence/compact/griffin-sky-joust.png), [Wide](evidence/wide/griffin-sky-joust.png) |
| Realm Carver | Fail: S2, C16 | Fail: S2, C16 | Pass | Pass | [Compact](evidence/compact/realm-carver.png), [Wide](evidence/wide/realm-carver.png) |
| Paladin's Twin-Soul | Fail: S2, C17, V03 | Fail: S2, C17 | Pass | Pass | [Compact](evidence/compact/paladins-twin-soul.png), [Wide](evidence/wide/paladins-twin-soul.png) |
| Devourer Slime | Fail: S2, C18 | Fail: S2, C18 | Pass | Pass | [Compact](evidence/compact/devourer-slime.png), [Wide](evidence/wide/devourer-slime.png) |
| The Haunted Library | Fail: S2, C19, V04 | Fail: S2, C19 | Pass | Pass | [Compact](evidence/compact/haunted-library.png), [Wide](evidence/wide/haunted-library.png) |
| Gryphon Patrol | Fail: S2, C20, V05 | Fail: S2, C20, V05 | Pass | Pass | [Compact](evidence/compact/gryphon-patrol.png), [Wide](evidence/wide/gryphon-patrol.png) |

## Shared Findings

### S1 Blocker: The evidence route is not the catalog route

- **Observed:** The screenshots use the public preview host.
- **Expected:** Catalog evidence must exercise the route opened by a catalog card.
- **Reproduction:** Open `/`, select a game card, and inspect the resulting URL.
- **Evidence:** [Shared layer, launch path](../../audit-reports/advantage-games-ux-wiring_20260819/shared-layer.md#launch-path).
- **Status:** Open. The screenshot set remains useful renderer evidence only.

### S2 Blocker: The APK presentation does not match the catalog promise

- **Observed:** Every inspected scene uses procedural shapes and text instead of its promised art.
- **Expected:** The play surface must present the recognizable game shown by the card.
- **Reproduction:** Compare any catalog cover and description with its compact or wide screenshot.
- **Evidence:** All 40 linked screenshots and the [asset deep pass](../../audit-reports/advantage-games-ux-wiring_20260819/assets.md#shared-asset-facts).
- **Status:** Open. New art and mechanic rebuilds are outside this evidence track.

### S3 Major: Asset bindings are validation stubs

- **Observed:** Both hosts map every declared key to one hero sheet. Cartridge scenes do not load or draw that sheet.
- **Expected:** A production edition must resolve and render accepted semantic assets.
- **Reproduction:** Inspect `createDeveloperEdition`, `createStudentEdition`, and any cartridge scene.
- **Evidence:** [Asset deep pass, standard pack](../../audit-reports/advantage-games-ux-wiring_20260819/assets.md#1-standard-pack-is-not-on-the-catalog-path).
- **Status:** Open.

### S4 Major: Music and credits are false on the APK path

- **Observed:** The APK hosts do not start music. All catalog music files are the same placeholder file.
- **Observed:** The debrief credits pixel art even when a scene renders only shapes.
- **Expected:** Audio and credits must describe assets that the student receives.
- **Reproduction:** Start any APK session, then inspect the debrief and host audio wiring.
- **Evidence:** [Executive summary](../../audit-reports/advantage-games-ux-wiring_20260819/executive-summary.md#shared-defects-all-28).
- **Status:** Open. Audio was not manually reverified during screenshot capture.

### S5 Major: Exit and locale wiring are invalid

- **Observed:** Public preview Exit has no navigation handler.
- **Observed:** Authenticated Exit targets a missing `/student/games` page. Chinese content can produce a `/cn` URL.
- **Expected:** Exit must return to a valid localized catalog route.
- **Reproduction:** Finish a preview and an authenticated session, then select Exit.
- **Evidence:** [Shared layer, locale and exit](../../audit-reports/advantage-games-ux-wiring_20260819/shared-layer.md#locale-and-exit).
- **Status:** Open. The screenshot workflow did not reach debrief.

### S6 Major: The tutorial contract is generic

- **Observed:** The shared tutorial uses one incorrect selection followed by one correct selection.
- **Expected:** Each tutorial must demonstrate its visible movement and learning mechanic.
- **Reproduction:** Start the guided tutorial for each title and compare its actions with the briefing.
- **Evidence:** [Shared layer, standard experience](../../audit-reports/advantage-games-ux-wiring_20260819/shared-layer.md#standard-experience).
- **Status:** Open. Several cartridges add custom actions, but the audit found title-specific gaps.

## Title Findings

For C01 through C20, open the linked route, complete the guided tutorial, and enter scored play.

Compare the visible mechanic with the card description and the linked audit section.

| ID | Severity | Cartridge | Source-confirmed defect | Status |
|---|---|---|---|---|
| C01 | Major | Castle Defense | Castle and tower art remain absent. | Open |
| C02 | Major | Magic Defense | Briefing, typing prompt, and tutorial action disagree. | Open |
| C03 | Major | RPG Battle | Hero, location, and enemy selection are absent. | Open |
| C04 | Major | Wizard vs Zombie | The tutorial never demonstrates the promised shockwave. | Open |
| C05 | Major | Enchanted Library | The HUD prints the answer and highlights the correct book. | Open |
| C06 | Major | Rune Match | Monster selection is absent, and the monster is always a goblin shape. | Open |
| C07 | Major | Alchemist's Synthesis | The promised merge-and-brew loop is a timed multiple-choice task. | Open |
| C08 | Major | Potion Rush | Shop art, customer art, cauldron art, and brew sounds are absent. | Open |
| C09 | Major | Dungeon Liberator | Rescue play uses placeholder circles instead of the available dungeon presentation. | Open |
| C10 | Major | Rune Forge Chamber | Difficulty and rune-type choices are absent. | Open |
| C11 | Major | Village Guardian | Difficulty and opponent choices are absent. | Open |
| C12 | Blocker | The Abyssal Well | The catalog cover path is missing, and start choices are absent. | Open |
| C13 | Major | Archer's Revenge | Bow art and music are absent from the APK path. | Open |
| C14 | Major | Storm the Castle Tower | Climber art and music are absent from the APK path. | Open |
| C15 | Major | Griffin Sky-Joust | The griffin is a triangle, music is absent, and tutorial movement teleports. | Open |
| C16 | Major | Realm Carver | The territory board uses shapes, and music is absent. | Open |
| C17 | Major | Paladin's Twin-Soul | The tutorial does not demonstrate movement and shooting. | Open |
| C18 | Major | Devourer Slime | The tutorial resolves an orb without demonstrating movement. | Open |
| C19 | Major | The Haunted Library | Up can open a nearby door, and the compact D-pad covers the lowest floor. | Open |
| C20 | Major | Gryphon Patrol | The FIRE control has no label, and the tutorial omits flight. | Open |

Title source evidence appears in [findings.md](../../audit-reports/advantage-games-ux-wiring_20260819/findings.md).

The verdict table links one compact and one wide screenshot for every title.

## Manual Visual Findings

### V01 Major: Potion Rush labels overlap core targets

- **Reproduction:** Open Potion Rush, enter scored play, and inspect the ingredient area.
- **Evidence:** [Compact](evidence/compact/potion-rush.png), [Wide](evidence/wide/potion-rush.png).

### V02 Major: Griffin Sky-Joust target labels collide

- **Reproduction:** Open Griffin Sky-Joust, enter scored play, and inspect the knight labels.
- **Evidence:** [Compact](evidence/compact/griffin-sky-joust.png), [Wide](evidence/wide/griffin-sky-joust.png).

### V03 Major: Paladin's Twin-Soul compact labels collide

- **Reproduction:** Open Paladin's Twin-Soul at 390 by 844 and enter scored play.
- **Evidence:** [Compact](evidence/compact/paladins-twin-soul.png).

### V04 Major: Haunted Library controls obstruct play

- **Reproduction:** Open The Haunted Library at 390 by 844 and inspect the lowest floor.
- **Evidence:** [Compact](evidence/compact/haunted-library.png).

### V05 Major: Gryphon Patrol lacks a readable fire target flow

- **Reproduction:** Open Gryphon Patrol, enter scored play, and inspect the target and fire control.
- **Evidence:** [Compact](evidence/compact/gryphon-patrol.png), [Wide](evidence/wide/gryphon-patrol.png).

## Resolved During This Track

### R1 Major: Castle Defense accepted live tutorial input

- **Cause:** The scene processed input in `tutorial` mode.
- **Fix:** Scene input now runs only in `playing` mode.
- **Test:** The new Red test failed because ArrowLeft moved the player.
- **Verification:** `castle-defense.test.ts` passes all 19 tests after the fix.
- **Status:** Resolved.

## Review Method

The operator directly inspected every compact and wide screenshot after scored play started.

The capture observations support canvas, console, error-text, input-dispatch, and overflow checks.

The UX wiring audit supplies source facts that a static screenshot cannot prove.

This report records failures. It does not certify the current APK catalog for release.
