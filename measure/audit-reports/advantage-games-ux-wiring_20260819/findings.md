# Advantage Games UX Wiring Audit — Findings

**Date:** 2026-08-19  
**Catalog source:** `apps/advantage-games/src/lib/gameCards.ts` (28 titles)

Every game inherits the shared defects in [shared-layer.md](./shared-layer.md). The blocks below record the extra, title-specific user-experience error.

Severity:

- **Blocker** — the catalog path is the wrong game, or a primary visual is broken.
- **Major** — play works, but the student sees the wrong art, wrong help, or a lost start flow.
- **Minor** — a leftover path or credit is wrong.

---

## 1. castle-defense

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Tutorial still takes live input, and castle art does not appear |
| **User-visible effect** | During the guided tutorial, WASD and clicks still move the player. The student can break the demo. Play is colored circles, not towers or enemy sheets. |
| **Evidence** | Card `href` `/student/games/apk/castle-defense`. Cartridge `packages/game-cartridges/src/castle-defense.ts` `update` treats only `sessionMode !== "demo"` as locked. Host `APKGameHost` passes `"tutorial"`. `updateView` uses `fillRect` / `fillCircle`. Binding `legacy-catalog/castle-defense/fortress` maps to `asset-6aeab3f50c0f6be4.png`. Real art sits in `public/games/castle-defense/`. Card text says "Collect words to build towers". Cartridge `inputMode` is `sentence`. |

Leftover page `student/games/sentence/castle-defense` still has `GameStartScreen` with difficulty and ranking.

---

## 2. dragon-rider

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog launches a two-button quiz, not village flight |
| **User-visible effect** | The card says "Ride your dragon to protect your village". The student gets one cyan circle and two route buttons. One button prints the translation. The student can tap that text and skip learning. |
| **Evidence** | Loader is `createDragonRiderCartridge` in `legacy-traversal-cartridges.ts`. `DRAGON_RIDER_OPTIONS.actions` is `["move-left", "move-right"]`. `updateView` sets `label = action === state.correctAction ? state.answer : "Left route" / "Right route"`. Completion is always `"victory"`. Leftover `DragonRiderGame` still loads gate, player, and army sheets and calls `useBackgroundMusic('dragon-rider')`. Binding `dragon-rider/player-flight` is unused. |

---

## 3. magic-defense

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Briefing, HUD, and art do not match |
| **User-visible effect** | Briefing says "Choose translation lanes". The canvas says "Type the translation for: …". Castles are purple rectangles. Missiles are orange dots. Tutorial taps a choice and never types. |
| **Evidence** | `createMagicDefenseCartridge` description is lane choice. Scene prompt is `Type the translation for: ${state.prompt}`. `executeTutorialAction` calls `chooseAnswer`. Binding `legacy-catalog/magic-defense/arcane-castle` maps to the QC stub. Sheets exist in `public/games/magic-defense/`. Card text is typing. |

---

## 4. rpg-battle

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Hero, location, and enemy pickers are gone |
| **User-visible effect** | The student never picks a hero, arena, or enemy. Two pulsing circles replace pose sheets. Ranking on the start screen is gone. Sound effects are gone. |
| **Evidence** | Leftover `StartScreen` and `BattleSelectionModal` live under `components/games/vocabulary/rpg-battle/`. APK `rpg-battle.ts` `updateView` draws two `fillCircle` nodes. Binding `legacy-catalog/rpg-battle/arena` maps to the QC stub. Art exists in `public/games/rpg-battle/`. |

---

## 5. dragon-flight

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Sprite flight is a triangle, and a wrong gate cannot fail the run |
| **User-visible effect** | The student sees a cyan triangle and two boxes. A wrong gate keeps the same word. There is no lost dragon, no boss, and no defeat. Every finish is a victory. |
| **Evidence** | `requiredAssetBindings: []`. `dragon-flight.ts` `updateView` uses `fillTriangle` / `fillRoundedRect`. `choose` on an incorrect gate sets `progressed: false`. `createGameConfig` always calls `context.complete(result, "victory")`. Painted sheets exist in `public/games/dragon-flight/` and stay unused. |

---

## 6. wizard-vs-zombie

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Tutorial never casts a shockwave, and sheets do not appear |
| **User-visible effect** | Briefing says collect an orb and cast a shockwave. The demo only collects an orb. Play is a lime circle, teal orbs, and red dots. |
| **Evidence** | `mechanicInstruction` names the shockwave. `executeTutorialAction` only calls `collectOrb`. `updateView` uses `fillCircle`. Binding `legacy-catalog/wizard-vs-zombie/zombie-orbs` maps to the QC stub. Sheets exist in `public/games/wizard-vs-zombie/`. Leftover `GameStartScreen` is not on the catalog path. |

---

## 7. enchanted-library

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | HUD prints the answer and paints the correct book |
| **User-visible effect** | The student sees `Find the translation for: {term}` and `Target book: {translation}` at the same time. The correct book has a gold outline. The student does not need to read the books. |
| **Evidence** | `enchanted-library.ts` `updateView` sets `Target book: ${state.answer}` and `book.isCorrect ? 0xffd166 : 0xd7c4ff`. Leftover `EnchantedLibraryGame` does not print the answer. Binding `enchanted-library/arcane-shelves` is unused. Sheets exist under `public/games/enchanted-library/` and `public/games/vocabulary/enchanted-library/`. |

---

## 8. rune-match

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Monster select is gone. The fight is always a goblin circle |
| **User-visible effect** | The card promises an RPG puzzle battle. The student cannot pick Goblin, Skeleton, Orc, or Dragon. The monster is a pulsing circle. Pose sheets never appear. |
| **Evidence** | `rune-match.ts` hard-codes `monster: { type: "goblin", ... }`. `updateView` draws `fillCircle` and rune rectangles. Binding `rune-match/monster-rune-board` maps to the QC stub. Leftover `MonsterSelection` still points at `public/games/vocabulary/rune-match/monsters/`. |

---

## 9. alchemists-synthesis

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Card promises merge-and-brew. Play is timed multiple choice |
| **User-visible effect** | The card says "matching and merging vocabulary to synthesize powerful spells". Play is "select the term that matches the translation" before a timer ends. There is no merge step. There is no spell craft. |
| **Evidence** | Card text in `gameCards.ts`. Cartridge `mechanicInstruction` is "Move the cursor or tap a term that matches the translation prompt." There is no `public/games/alchemists-synthesis/` folder. Debrief still credits ElvGames pixel art. |

---

## 10. potion-rush

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Shop art and brew sounds are not on the catalog path |
| **User-visible effect** | The cover shows a potion shop. Play is silent colored blocks. Customers are pink circles. Cauldrons are rectangles. |
| **Evidence** | `potion-rush.ts` `updateView` uses `fillRoundedRect` / `fillCircle`. Binding `potion-rush/customer-cauldron` maps to the QC stub. Leftover `PotionRushGame` loads `shop-wall.png`, `shop-floor.png`, `shop-counter.png` and plays cash-register and bubbling sounds. File `public/sounds/music/potion-rush.mp3` exists and is unused. |

---

## 11. dungeon-liberator

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Rescue play uses placeholder circles |
| **User-visible effect** | The cover shows a torchlit dungeon. Catalog play is a dark rectangle with a blue player dot, orange prisoner dots, and red slime dots. |
| **Evidence** | `dungeon-liberator.ts` `updateView` uses `fillCircle` (`0x38bdf8`, `0xf97316`, `0xef4444`). Binding `dungeon-liberator/prisoner-rescue` maps to the QC stub. Leftover game loads `background.png`, `player-sheet.png`, `prisoner-sheet.png`, `slime-sheet.png`. Cover path `dungeon-liberator.png` exists. Music file exists and is unused. |

---

## 12. spellweavers-run

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog runner is a three-route quiz |
| **User-visible effect** | The card says "Collect word orbs in the correct order… enchanted forest runner". Play is a dark panel, one pink circle, and three buttons. One button shows the next word. There is no run, no orb timing, and no mana fail. The session cannot end in defeat. |
| **Evidence** | `SPELLWEAVERS_RUN_OPTIONS` in `legacy-traversal-cartridges.ts` uses `actions: ["move-left", "confirm", "move-right"]`. Labels are `state.answer` or "Left route" / "Center route" / "Right route". `complete(result, "victory")`. Leftover `SpellweaversRunGame` still starts `useBackgroundMusic('spellweavers-run')`. |

---

## 13. shadow-gate-dungeon

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog APK is a route quiz, not the dungeon |
| **User-visible effect** | The card says collect crystals and escape a shadow creature. The student gets four direction buttons and one word label. There is no dungeon, creature, or health. |
| **Evidence** | `createShadowGateDungeonCartridge` uses the shared traversal scene. `actions` are the four move IDs. Binding `shadow-gate-dungeon/player` maps to the QC stub. Disk art is only `public/games/shadow-gate-dungeon/shadow-gate-dungeon-gameplay.png`. Leftover Konva dungeon still exists. |

---

## 14. rune-forge-chamber

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Start screen and rune-type choice are gone. Sigils are circles |
| **User-visible effect** | The student cannot pick Easy/Medium/Hard/Extreme or Common Stone / Rare Crystal / Void Essence. Play is purple and gold circles. |
| **Evidence** | Leftover `RuneForgeChamberGame` has `difficulty-select` and `rune-type-select`. APK `createRuneForgeChamberCartridge` does not expose them. Binding `rune-forge-chamber/orbiting-sigils` maps to the QC stub. Music file exists and is unused. |

---

## 15. village-guardian

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Difficulty and opponent start controls are gone |
| **User-visible effect** | The student cannot pick Scout Party / War Band / Full Siege / Apocalypse or Bandits / Goblins / Dragons. Play is colored circles for player, villagers, monsters, and sanctuary. |
| **Evidence** | Leftover `VillageGuardianGame` `GameStartScreen` has `selectedDifficulty` and `selectedOpponent`. Binding `village-guardian/sanctuary-guide` maps to the QC stub. Scene uses `fillCircle` only. Music file exists and is unused. |

---

## 16. labyrinth-goblin-king

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog APK is a route quiz, not the maze |
| **User-visible effect** | The card says navigate a maze, collect orbs, and become a Paladin. The student gets the same four-button traversal UI as Shadow Gate. There is no maze, goblin, or Paladin form. |
| **Evidence** | `LABYRINTH_GOBLIN_KING_OPTIONS` in `legacy-traversal-cartridges.ts`. There is no `public/games/labyrinth-goblin-king/` folder. Binding `labyrinth-goblin-king/player` maps to the QC stub. Leftover `LabyrinthGoblinKingGame` still has the maze start screen. |

---

## 17. abyssal-well

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog cover path is missing |
| **User-visible effect** | The catalog card shows a broken image. After launch, the student sees rings and circles, not well art. Original start choices (Shallow Well / Deep Chasm / Abyss) are gone. |
| **Evidence** | Card cover is `withBasePath('/games/cover/cover-the-abyssal-well.png')`. Disk has `public/games/cover/abyssal-well-cover.png` only. Graph has **zero** nodes for this title. Binding `abyssal-well/rim-and-enemies` maps to the QC stub. There is no `public/games/abyssal-well/` folder. Controller calls `startGame()` at once, so in-game phase `"start"` never shows. |

---

## 18. archers-revenge

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Bow art and music are not on the catalog path |
| **User-visible effect** | The student sees a circle archer. The start-screen image never appears. Catalog play is silent. The leftover page Back link goes to `/games`, which is not the student catalog. |
| **Evidence** | Binding `archers-revenge/player-bow` maps to the QC stub. Files `archers-revenge-start-screen.png` and `archers-revenge-gameplay.png` have no APK callers. Leftover `ArchersRevengeGame` calls `useBackgroundMusic('archers-revenge')`. Leftover page link is `<Link href="/games">`. |

---

## 19. storm-castle-tower

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Catalog climb has no climber art and no music |
| **User-visible effect** | The student sees a triangle climber and hears no music. The cover and unused gameplay image show a painted castle. Debrief still credits ElvGames pixel art. |
| **Evidence** | Binding `storm-castle-tower/player-climber` maps to the QC stub. `storm-castle-tower.ts` `updateView` draws `fillCircle` / `fillTriangle`. File `public/games/storm-castle-tower/storm-castle-tower-gameplay.png` exists and is unused. Leftover `StormCastleTowerGame` calls `useBackgroundMusic('storm-castle-tower')`. |

---

## 20. griffin-sky-joust

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Griffin is a triangle. Both music files stay silent |
| **User-visible effect** | The student sees a cyan triangle "griffin" and grey knight blobs. The tutorial snaps the griffin onto a knight. No battle music plays. |
| **Evidence** | Binding `griffin-sky-joust/player-griffin` maps to the QC stub. `griffin-sky-joust.ts` `updateView` uses `fillTriangle`. `executeTutorialCollision` writes `player.x` / `player.y` onto the knight. `public/games/sentence/griffin-sky-joust/` has no files. Music files `griffin-sky-joust.mp3` and `griffin-sky-joust-battle.mp3` exist. Extra unused cover `griffin-sky-joust-cover.png` sits beside the card file `cover-griffin-sky-joust.png`. |

---

## 21. realm-carver

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Territory board is a color grid with no art and no music |
| **User-visible effect** | The student sees colored cells, a cream circle, and a red circle. The catalog cover and unused gameplay screenshot show painted art. No music plays on the catalog path or the leftover Konva path. |
| **Evidence** | Binding `realm-carver/player-carver` maps to the QC stub. `realm-carver.ts` uses `fillRect` / `fillCircle` only. File `public/games/realm-carver/realm-carver-gameplay.png` is unused. `public/games/sentence/realm-carver/` is empty. `RealmCarverGame` has start and end screens and does not call `useBackgroundMusic`. Music file exists. |

---

## 22. paladins-twin-soul

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Guided tutorial does not show move-and-shoot. The board has no sprites |
| **User-visible effect** | Briefing says "Move left or right, then confirm a shot." The tutorial freezes the formation, then deletes an enemy by id. The student never sees movement, confirm, or auto-fire. Sprites are colored rectangles. Catalog play has no music. |
| **Evidence** | `executeTutorialAction` calls `controller.choose(state.correctAction)` where `correctAction` is `currentEnemyId()`. Frame scheduler returns when `sessionMode !== "playing"`, so auto-fire does not run in tutorial. Binding `paladins-twin-soul/player` maps to the QC stub. There is no `public/games/paladins-twin-soul/` folder. Leftover game calls `useBackgroundMusic('paladins-twin-soul')`. |

---

## 23. griffin-riders-escape

| Field | Value |
|---|---|
| **Severity** | Blocker |
| **Issue** | Catalog launches a left/right quiz instead of the sky-lane runner |
| **User-visible effect** | The card says "Fly through the magical gates." The student gets two buttons, one word, and a circle on a panel. There is no 3-lane flight, no gates, no obstacles, and no music. A bookmark to the leftover URL still opens the runner. |
| **Evidence** | `GRIFFIN_RIDERS_ESCAPE_OPTIONS` in `legacy-traversal-cartridges.ts`. Real files exist: `public/games/sentence/griffin-riders-escape/{background,gate,obstacle,player-3x3-sheet}.png`. Leftover `GriffinRidersEscapeGame` uses `switchLane`, `GameStartScreen`, `GameEndScreen`, and `useBackgroundMusic('griffin-riders-escape')`. |

---

## 24. astral-mage

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Illustrated mage cover opens a silent shape arena with a false art credit |
| **User-visible effect** | The student sees stars, triangles, and a purple circle mage. No mage sprite loads. No music plays. The debrief credits ElvGames pixel art even though this cartridge ships no pixel art. |
| **Evidence** | `ASTRAL_MAGE_CATALOG_ENTRY.requiredAssetBindings` is `[]`. `astral-mage.ts` `updateView` draws `fillCircle` / `fillTriangle`. There is no leftover page and no `public/games/astral-mage/` folder. Graph has **one** node. Music file `astral-mage.mp3` exists. `useBackgroundMusic` lists the ID. No catalog host calls it. |

---

## 25. devourer-slime

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Cover promises painted slime-and-knight art. Play is primitive shapes |
| **User-visible effect** | The student sees a castle-slime cover, then a green box with a green circle, gold circles, and gray squares. The tutorial does not show movement. The slime stays in place while an orb resolves. |
| **Evidence** | Binding `devourer-slime/player` maps to the QC stub. `devourer-slime.ts` `updateView` fills `0x064e3b` rects and `fillCircle` nodes. `executeTutorialAction` calls `demonstrateOrb` → `resolveOrb`. There is no `public/games/devourer-slime/` folder. Leftover sentence page still exists. |

---

## 26. sorcerer-ziggurat

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Empty asset bindings. Cover shows an isometric cube climb that the scene does not draw |
| **User-visible effect** | The student sees painted isometric cubes on the card, then three flat rounded rectangles on two triangles. There is no player sprite and no defeat. Every finish is a victory. |
| **Evidence** | `requiredAssetBindings: []`. Card text: "Jump through an isometric pyramid of cubes…". `updateView` draws `fillTriangle` and `fillRoundedRect`. Pointer pick uses X only (`chooseZigguratDirectionFromPointer`). `createGameConfig` always calls `context.complete(result, "victory")`. There is no leftover page and no `public/games/sorcerer-ziggurat/` folder. Graph has **one** node. |

---

## 27. haunted-library

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | Portrait D-pad covers the lowest floor. Up opens a nearby door instead of a jump |
| **User-visible effect** | On a 390×844 canvas, the unlabeled D-pad sits on floor 0 and the trampolines. A press of Up within 72 px of any closed door opens that door. The student can open the wrong door while they try to jump. Tutorial input stays live. |
| **Evidence** | `HAUNTED_LIBRARY_CANVAS` is 390×844. Floor 0 is `y = 744`. D-pad center is `height * 0.82` (~692). `findNearestHauntedLibraryDoor` uses `distance <= 72`. `move("up")` opens that door before it jumps. `move("down")` only cancels upward velocity. Floors change on edge trampolines. Update loop still reads input when `sessionMode === "tutorial"`. Binding `haunted-library/player` is unused. File `public/sounds/haunted-library-ambient.mp3` is unused. |

---

## 28. gryphon-patrol

| Field | Value |
|---|---|
| **Severity** | Major |
| **Issue** | On-screen text says "Tap FIRE", but the fire control has no FIRE label |
| **User-visible effect** | Touch players see "Tap FIRE to shoot", then an empty yellow box in the lower-right. The player is a yellow circle, not the painted gryphon from the cover. Tutorial hits an enemy and collects an orb with no flight demo. |
| **Evidence** | `gryphon-patrol.ts` `instructions.setText("… Tap FIRE to shoot")`. Fire zone is `FIRE_ZONE_RATIO = 0.78`. Draw call is `fillRoundedRect(width - 150, height - 82, 120, 54, 14)` with no "FIRE" text. Binding `gryphon-patrol/player` is unused. There is no `public/games/gryphon-patrol/` folder. Card description is only "Hunt the sentences across the sky!". |

---

## Coverage checklist

| # | ID | Severity | Documented |
|---|---|---|---|
| 1 | castle-defense | Major | Yes |
| 2 | dragon-rider | Blocker | Yes |
| 3 | magic-defense | Major | Yes |
| 4 | rpg-battle | Major | Yes |
| 5 | dragon-flight | Major | Yes |
| 6 | wizard-vs-zombie | Major | Yes |
| 7 | enchanted-library | Major | Yes |
| 8 | rune-match | Major | Yes |
| 9 | alchemists-synthesis | Major | Yes |
| 10 | potion-rush | Major | Yes |
| 11 | dungeon-liberator | Major | Yes |
| 12 | spellweavers-run | Blocker | Yes |
| 13 | shadow-gate-dungeon | Blocker | Yes |
| 14 | rune-forge-chamber | Major | Yes |
| 15 | village-guardian | Major | Yes |
| 16 | labyrinth-goblin-king | Blocker | Yes |
| 17 | abyssal-well | Blocker | Yes |
| 18 | archers-revenge | Major | Yes |
| 19 | storm-castle-tower | Major | Yes |
| 20 | griffin-sky-joust | Major | Yes |
| 21 | realm-carver | Major | Yes |
| 22 | paladins-twin-soul | Major | Yes |
| 23 | griffin-riders-escape | Blocker | Yes |
| 24 | astral-mage | Major | Yes |
| 25 | devourer-slime | Major | Yes |
| 26 | sorcerer-ziggurat | Major | Yes |
| 27 | haunted-library | Major | Yes |
| 28 | gryphon-patrol | Major | Yes |

Outside the catalog: `babel-architect` has music and a `useBackgroundMusic` ID. It has no catalog card and no APK loader.
