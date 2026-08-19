# Advantage Games UX Wiring Audit — Asset Deep Pass

**Date:** 2026-08-19  
**Scope:** Catalog APK path only (`/` Vocab Arcade cards + `/en/student/games/apk/{id}`)  
**Bar:** Broken paths, unwired files, QC stubs, sheet geometry, empty dirs, false credits, invalid binding keys

This pass measures files on disk. It does not treat leftover Konva pages as play surfaces.

## Shared asset facts

### 1. Standard pack is not on the catalog path

`packages/advantage-play-kit/assets/standard` holds the accepted 2026.07.23 pack (43,075 assets). Policy says this is the only production art source. `privatePackTrees` are prohibited.

`AuthenticatedCartridgeHost.createStudentEdition` does not call `createAcceptedStandardAssetResolver` or `createSemanticAssetResolver`. It maps every cartridge key to one QC file:

- file: `/assets/apk/standard-pack-qc/asset-6aeab3f50c0f6be4.png`
- identity: `top-down/32x32/characters/hero-01`
- size: 192×384
- grid: 6 columns × 12 rows of 32×32
- populated frames: 68
- empty frames: 4
- host usage: `image`
- host view: `screen`

The student never sees a 32×32 hero frame. The host treats the whole sheet as one screen image. Cartridge scenes do not load it. They draw shapes.

Extra host defects:

- Provenance license on the bound file is `LicenseRef-Reading-Advantage-Original`. The accepted pack requires `Pixel art assets by ElvGames`.
- `view: "screen"` plus `kind: "image"` skips the kit actor contract (`TOP_DOWN_CHARACTER_GRID` is 4×8 cells of 128 px). QC preview uses `view: "top-down"` and a 32×32 cell. The catalog host does not.
- `mountCartridge` calls `validateEdition` only. It does not call `preloadAssetBindings` or `resolveAssetBinding`. Phaser never loads `edition.pack.files`. Bindings only satisfy `MISSING_ASSET_SLOT`.
- `hit-01` has a minimum opaque area of 4 px (2×2). A whole-sheet image is mostly empty.

### 2. Six of seven QC pack files stay unused

`public/assets/apk/standard-pack-qc/` has all seven owner-approved files. The catalog host binds only the hero sheet.

| QC file | Canonical key | Size | Empty frames | Catalog use |
|---|---|---|---|---|
| `asset-6aeab3f50c0f6be4.png` | `top-down/32x32/characters/hero-01` | 192×384 | 4 of 72 | Bound as screen image; scenes ignore it |
| `asset-0edfb7ed11f9c4cf.png` | `side-view/32x32/characters/enemy-001-idle` | 192×32 | 0 of 6 | Unused |
| `asset-5062b915d194a51d.png` | `effects/32x32/combat/hit-01` | 192×128 | **19 of 24** | Unused |
| `asset-860451d3140de5ef.png` | `ui/16x16/controls/gamepad-buttons` | 352×160 | **90 of 220** | Unused |
| `asset-364560d9df9ebc14.png` | `ui/20x20/inventory/slot` | 20×20 | 0 | Unused |
| `asset-b01bae484f26a7ee.png` | `ui/32x32/items/armor-icons` | 512×896 | 24 of 448 | Unused |
| `asset-25c239ed9b6c9cd8.ogg` | `audio/native/combat/hit-01` | 20,939 B | n/a | Unused |

Owner-approved roles exist only for `player:idle`, `enemy:idle`, `feedback:correct`, `control:confirm`, `panel:default`, `status:armor`, and `audio-feedback:correct`. Semantic-adoption candidates exist only for dragon-flight, magic-defense, dungeon-liberator, sorcerer-ziggurat, and astral-mage. Those candidates are marked `consumable: false`.

### 3. Every catalog music file is the placeholder

All 28 `public/sounds/music/{id}.mp3` files are **4,387 bytes** and share SHA-256 `a4520d6796f86d79ce0c0cf87f814084bd7e1063cf60435cddc0ce90c6deb818` with `placeholder.mp3`.

Real unused tracks sit beside them:

- `public/sounds/dragon-flight-adventure.mp3` (6,188,606 B)
- `public/sounds/griffin-sky-joust-battle.mp3` (6,120,897 B)
- `public/sounds/haunted-library-ambient.mp3` (6,489,537 B)
- `public/sounds/potion-rush-action.mp3` (6,471,983 B)
- `public/sounds/spellweavers-run-action.mp3` (5,832,505 B)

The APK host does not play music. If it did, the student would hear the placeholder.

### 4. Catalog cards use `next/image` with wrong types and a broken Abyssal Well link

`apps/advantage-games/src/app/page.tsx` sets `width={1024}` and `height={1536}`. Every real cover is 1024×1024. The card letterboxes a square into a 2:3 frame.

Seven covers are JPEG bytes with a `.png` name. Two cover paths are broken symlinks to `/home/daniel-bo/Desktop/advantage-games/...` on another machine.

### 5. Invented binding keys

No cartridge `requiredAssetBindings` value is a standard-pack semantic key (`top-down/32x32/characters/hero-01` and the six siblings). Every declared key is a private string. The host still accepts it and points it at the hero sheet.

---

## Per-game asset findings

### 1. castle-defense

| Defect | Detail |
|---|---|
| Invented key | `legacy-catalog/castle-defense/fortress` |
| QC stub | Bound to hero-01 192×384 sheet as `view: screen` |
| Unwired private tree | `public/games/castle-defense/` (14 files) |
| Sheet geometry | `goblin_3x3` 596×419; `orc_3x3` 609×410; `player_3x3` 853×948; `zombie_3x3` 854×957. Cells are not whole pixels. Only `troll_3x3` 594×420 divides by 3. |
| Music | Placeholder clone |

### 2. dragon-rider

| Defect | Detail |
|---|---|
| Invented key | `dragon-rider/player-flight` |
| Cover type | `cover-dragon-rider.png` is **JPEG**, not PNG |
| Unwired private tree | `public/games/dragon-rider/` sheets are all 1024×1024 named `3x3`. 1024/3 is not an integer. |
| Music | Placeholder clone. No dedicated real track. |

### 3. magic-defense

| Defect | Detail |
|---|---|
| Invented key | `legacy-catalog/magic-defense/arcane-castle` |
| Semantic candidate | Role set exists (`panel`, `status`, `feedback`, `audio-feedback`) and is not consumable. Host ignores it. |
| Sheet geometry | `skeletons_3x3_pose_sheet.png` is 426×427. Height is not divisible by 3. |
| `castles_3x2_sheet.png` | 1536×1024 divides as 3 columns × 2 rows (512×512). The painting is **2 columns × 3 rows** (blue/gold × intact/smoked/burning). A 3×2 slice would cut through the castles. |
| Music | Placeholder clone |

### 4. rpg-battle

| Defect | Detail |
|---|---|
| Invented key | `legacy-catalog/rpg-battle/arena` |
| Unwired arenas | Four 1536×1024 backgrounds |
| Sheet geometry | All six hero/enemy `3x3` sheets fail integer cells (500×500 and 1024×1024). |
| Music | Placeholder clone |

### 5. dragon-flight

| Defect | Detail |
|---|---|
| Empty bindings | `requiredAssetBindings: []`. Host binds nothing. Semantic candidate wants `player:idle`, `feedback:correct`, `audio-feedback:correct`. |
| Unwired private tree | `public/games/dragon-flight/` plus `vocabulary/dragon-flight/` |
| Sheet geometry | Army 509×490, gates 926×806, player-down 493×506 fail 3×3 math. Boss 495×504 and player-camera 954×957 divide. |
| Tiny projectiles | `projectile-boss.png` and `projectile-fireball.png` are **identical** 163-byte 64×64 PNGs (SHA-256 prefix `03e13b089a8d`). They are one empty blob, not two projectiles. |
| Music | Catalog file is the placeholder. Real track `dragon-flight-adventure.mp3` (6.2 MB) is unused. |

### 6. wizard-vs-zombie

| Defect | Detail |
|---|---|
| Invented key | `legacy-catalog/wizard-vs-zombie/zombie-orbs` |
| Sheet geometry | Player 853×948 and zombie 854×957 fail 3×3 math. Orb 462×465 divides. |
| Music | Placeholder clone |

### 7. enchanted-library

| Defect | Detail |
|---|---|
| Invented key | `enchanted-library/arcane-shelves` |
| Duplicate file | `tile-library.png` and `library_background.png` are the same 1024×1024 PNG (SHA-256 prefix `01a78cdd2f65`). |
| Sheet geometry | Player 490×509, spirit 485×515, book 889×281, zombie 854×957 fail grid math. |
| Music | Placeholder clone |

### 8. rune-match

| Defect | Detail |
|---|---|
| Invented key | `rune-match/monster-rune-board` |
| Sheet geometry | All four monster `3x4` sheets and all three rune `3x2` sheets fail integer cells. |
| Music | Placeholder clone |

### 9. alchemists-synthesis

| Defect | Detail |
|---|---|
| Invented key | `alchemists-synthesis/alchemy-vessel` |
| Cover type | `cover-alchemists-synthesis.png` is **JPEG** |
| No game folder | There is no `public/games/alchemists-synthesis/` |
| Music | Placeholder clone |
| False credit | Debrief credits ElvGames pixel art. This title has no bound pixel art. |

### 10. potion-rush

| Defect | Detail |
|---|---|
| Invented key | `potion-rush/customer-cauldron` |
| Unwired shop set | Wall, floor, counter, three cauldrons, herbs, character sheets |
| Music | Catalog file is the placeholder. Real track `potion-rush-action.mp3` (6.5 MB) is unused. |

### 11. dungeon-liberator

| Defect | Detail |
|---|---|
| Invented key | `dungeon-liberator/prisoner-rescue` |
| Semantic candidate | Wants `player:idle`, `enemy:idle`, `feedback:correct`, `control:confirm`. Host ignores it. |
| Unwired sheets | `background.png` 1536×1024, `player-sheet.png` 933×890, `prisoner-sheet.png` 887×906, `slime-sheet.png` 900×804. None are a stated grid, so a 3×3 or 32×32 cut would clip. |
| Music | Placeholder clone |

### 12. spellweavers-run

| Defect | Detail |
|---|---|
| Invented key | `spellweavers-run/player-lane` |
| Disk art | Only `spellweavers-run-gameplay.png` (390×844 screenshot) |
| Music | Catalog file is the placeholder. Real track `spellweavers-run-action.mp3` (5.8 MB) is unused. |

### 13. shadow-gate-dungeon

| Defect | Detail |
|---|---|
| Invented key | `shadow-gate-dungeon/player` |
| Disk art | Only a 390×857 gameplay screenshot |
| Music | Placeholder clone |

### 14. rune-forge-chamber

| Defect | Detail |
|---|---|
| Invented key | `rune-forge-chamber/orbiting-sigils` |
| Disk art | Only a 390×844 gameplay screenshot |
| Music | Placeholder clone |

### 15. village-guardian

| Defect | Detail |
|---|---|
| Invented key | `village-guardian/sanctuary-guide` |
| Disk art | Only a 390×849 gameplay screenshot |
| Music | Placeholder clone |

### 16. labyrinth-goblin-king

| Defect | Detail |
|---|---|
| Invented key | `labyrinth-goblin-king/player` |
| No game folder | Cover PNG exists. No sprite folder. |
| Music | Placeholder clone |

### 17. abyssal-well

| Defect | Detail |
|---|---|
| Broken cover | Card asks for `cover-the-abyssal-well.png`. Disk has a **broken symlink** `abyssal-well-cover.png` → `/home/daniel-bo/Desktop/advantage-games/public/games/cover/cover-the-abyssal-well.png`. That machine path does not exist here. |
| Invented key | `abyssal-well/rim-and-enemies` |
| No game folder | No sprites |
| Music | Placeholder clone |

### 18. archers-revenge

| Defect | Detail |
|---|---|
| Invented key | `archers-revenge/player-bow` |
| Disk art | `archers-revenge-start-screen.png` and `archers-revenge-gameplay.png` are 427×844 screenshots. Neither is a bow sheet. |
| Music | Placeholder clone |

### 19. storm-castle-tower

| Defect | Detail |
|---|---|
| Invented key | `storm-castle-tower/player-climber` |
| Disk art | Only a 390×857 gameplay screenshot |
| Music | Placeholder clone |

### 20. griffin-sky-joust

| Defect | Detail |
|---|---|
| Invented key | `griffin-sky-joust/player-griffin` |
| Empty dir | `public/games/sentence/griffin-sky-joust/` has only `.gitkeep` |
| Broken extra cover | `griffin-sky-joust-cover.png` is a broken symlink to `/home/daniel-bo/Desktop/advantage-games/...`. Card uses the working `cover-griffin-sky-joust.png`. |
| Music | Catalog file is the placeholder. Real track `griffin-sky-joust-battle.mp3` (6.1 MB) is unused. |

### 21. realm-carver

| Defect | Detail |
|---|---|
| Invented key | `realm-carver/player-carver` |
| Empty dir | `public/games/sentence/realm-carver/` has only `.gitkeep` |
| Disk art | One 390×844 screenshot under `public/games/realm-carver/` |
| Music | Placeholder clone |

### 22. paladins-twin-soul

| Defect | Detail |
|---|---|
| Invented key | `paladins-twin-soul/player` |
| Broken extra cover | `public/games/vocabulary/paladins-twin-soul/cover.png` is a broken symlink to `/home/daniel-bo/Desktop/advantage-games/...` |
| Catalog cover | `cover-paladins-twin-soul.png` is a valid 1024×1024 PNG |
| No sprite folder | No player sheet |
| Music | Placeholder clone |

### 23. griffin-riders-escape

| Defect | Detail |
|---|---|
| Invented key | `griffin-riders-escape/player-lane` |
| Zero-byte files | `public/games/sentence/griffin-riders-escape/gate.png` is **0 bytes**. `obstacle.png` is **0 bytes**. Neither is a PNG. |
| Player sheet | `player-3x3-sheet.png` is 954×957 (divides). APK does not load it. |
| Cover reuse | Catalog cover `cover-griffin-riders-escape.png` is byte-identical to `sentence/griffin-riders-escape/background.png`. |
| Music | Placeholder clone |

### 24. astral-mage

| Defect | Detail |
|---|---|
| Empty bindings | `requiredAssetBindings: []`. Semantic candidate wants `player:idle`, `feedback:correct`, `audio-feedback:correct`. |
| Cover type | `cover-astral-mage.png` is **JPEG** |
| No game folder | No sprites |
| Music | Placeholder clone |
| False credit | Debrief credits ElvGames. Scene is procedural shapes. |

### 25. devourer-slime

| Defect | Detail |
|---|---|
| Invented key | `devourer-slime/player` |
| Cover type | `cover-devourer-slime.png` is **JPEG** |
| No game folder | No sprites |
| Music | Placeholder clone |

### 26. sorcerer-ziggurat

| Defect | Detail |
|---|---|
| Empty bindings | `requiredAssetBindings: []`. Semantic candidate wants `player:idle`, `feedback:correct`, `control:confirm`. |
| Cover type | `cover-sorcerers-ziggurat.png` is **JPEG** |
| No game folder | No sprites |
| Music | Placeholder clone |
| False credit | Debrief credits ElvGames. Scene is procedural shapes. |

### 27. haunted-library

| Defect | Detail |
|---|---|
| Invented key | `haunted-library/player` |
| Cover type | `cover-haunted-library.png` is **JPEG** |
| No game folder | No sprites |
| Music | Catalog file is the placeholder. Real track `haunted-library-ambient.mp3` (6.5 MB) is unused. |

### 28. gryphon-patrol

| Defect | Detail |
|---|---|
| Invented key | `gryphon-patrol/player` |
| Cover type | `cover-gryphon-patrol.png` is **JPEG** |
| Unwired aligned sheets | `player_gryphon_rider_3x3_pose_sheet.png` and `sky_raider_3x3_pose_sheet.png` are 384×384 (128×128 cells). These are the only catalog-adjacent 3×3 sheets that divide cleanly besides a few dragon-flight files. APK does not load them. |
| Unwired world | Feather bolt, word orb, and three 1280×720 parallax layers stay unused. |
| Music | Placeholder clone |

---

## Cover type matrix (catalog cards)

| ID | Card path | Disk fact |
|---|---|---|
| castle-defense | `castle-defense-cover.png` | PNG 1024×1024 |
| dragon-rider | `cover-dragon-rider.png` | **JPEG named .png** |
| magic-defense | `magic-defense-cover.png` | PNG 1024×1024 |
| rpg-battle | `rpg-battle-cover.png` | PNG 1024×1024 |
| dragon-flight | `dragon-flight-cover.png` | PNG 1024×1024 |
| wizard-vs-zombie | `wizard-vs-zombie-cover.png` | PNG 1024×1024 |
| enchanted-library | `enchanted-library-cover.png` | PNG 1024×1024 |
| rune-match | `rune-match-cover.png` | PNG 1024×1024 |
| alchemists-synthesis | `cover-alchemists-synthesis.png` | **JPEG named .png** |
| potion-rush | `potion-rush-cover.png` | PNG 1024×1024 |
| dungeon-liberator | `dungeon-liberator.png` | PNG 1024×1024 |
| spellweavers-run | `cover-spellweavers-run.png` | PNG 1024×1024 |
| shadow-gate-dungeon | `cover-shadow-gate-dungeon.png` | PNG 1024×1024 |
| rune-forge-chamber | `cover-rune-forge-chamber.png` | PNG 1024×1024 |
| village-guardian | `cover-village-guardian.png` | PNG 1024×1024 |
| labyrinth-goblin-king | `cover-labyrinth-of-the-goblin-king.png` | PNG 1024×1024 |
| abyssal-well | `cover-the-abyssal-well.png` | **Missing.** Sibling symlink `abyssal-well-cover.png` is broken. |
| archers-revenge | `cover-archers-revenge.png` | PNG 1024×1024 |
| storm-castle-tower | `cover-storm-the-castle-tower.png` | PNG 1024×1024 |
| griffin-sky-joust | `cover-griffin-sky-joust.png` | PNG 1024×1024. Extra `griffin-sky-joust-cover.png` symlink is broken. |
| realm-carver | `cover-realm-carver.png` | PNG 1024×1024 |
| paladins-twin-soul | `cover-paladins-twin-soul.png` | PNG 1024×1024. Extra vocab `cover.png` symlink is broken. |
| griffin-riders-escape | `cover-griffin-riders-escape.png` | PNG 1024×1024 |
| astral-mage | `cover-astral-mage.png` | **JPEG named .png** |
| devourer-slime | `cover-devourer-slime.png` | **JPEG named .png** |
| sorcerer-ziggurat | `cover-sorcerers-ziggurat.png` | **JPEG named .png** |
| haunted-library | `cover-haunted-library.png` | **JPEG named .png** |
| gryphon-patrol | `cover-gryphon-patrol.png` | **JPEG named .png** |

Home `Image` also asks for 1024×1536. Every valid cover is 1024×1024.

---

## What the first pass missed

The first pass said "covers exist" and "music files exist". That was wrong in quality:

1. One cover path is missing. Two more cover files are broken off-machine symlinks.
2. Seven catalog covers are JPEG files with a PNG name.
3. All 28 catalog music files are the same 4,387-byte placeholder.
4. Five real music tracks sit unused next to those placeholders.
5. The QC "image" is a 6×12 hero sheet with 4 empty frames, bound as a screen.
6. Hit FX in the QC pack has 19 empty frames of 24.
7. Gamepad UI in the QC pack has 90 empty frames of 220.
8. Griffin Rider gate and obstacle files are zero bytes.
9. Most leftover `3xN` sheets do not divide into the named grid.
10. Cartridge keys are not standard-pack semantic keys. The 43,075-asset pack is not on the catalog path.
