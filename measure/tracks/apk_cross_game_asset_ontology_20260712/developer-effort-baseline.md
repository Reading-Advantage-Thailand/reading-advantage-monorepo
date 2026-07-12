# Developer Effort Baseline

Measured from the exact current implementation paths in `game-corpus.json` at `ab80f58c55285c164c1b3cdbc3b9ed5b2a03c0ee`.

- 205 distinct matched implementation files.
- 37,661 physical source lines across those files.
- 9 games have Reading copy evidence, creating duplicate maintenance surfaces.
- Current authoring requires catalog, page/route, component, logic/config, tests, assets, host copy/integration, responsive CSS/canvas work, and browser QC to be coordinated manually.

## Largest matched files

| File                                                                                              | Lines |
| ------------------------------------------------------------------------------------------------- | ----: |
| `apps/advantage-games/src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx`         |  2210 |
| `apps/advantage-games/src/lib/games/castleDefense.ts`                                             |  1403 |
| `apps/advantage-games/src/lib/games/enchantedLibrary.test.ts`                                     |  1317 |
| `apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx`               |  1246 |
| `apps/advantage-games/src/lib/games/castleDefense.test.ts`                                        |   997 |
| `apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx` |   939 |
| `apps/advantage-games/src/components/games/sentence/castle-defense/CastleDefenseGame.tsx`         |   807 |
| `apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx`      |   746 |
| `apps/advantage-games/src/lib/games/runeMatch.ts`                                                 |   740 |
| `apps/advantage-games/src/lib/games/enchantedLibrary.ts`                                          |   729 |
| `apps/advantage-games/src/store/usePotionRushStore.ts`                                            |   679 |
| `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`    |   646 |
| `apps/advantage-games/src/lib/games/villageGuardian.ts`                                           |   631 |
| `apps/advantage-games/src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx`   |   627 |
| `apps/advantage-games/src/lib/games/labyrinthGoblinKing.ts`                                       |   625 |

## Required improvement proof

The shared kit must reduce lifecycle, input, progression, responsive, camera, HUD, audio, diagnostics, and test harness code without merging distinctive mechanics. Successor tracks must compare cartridge-specific files and steps against this baseline.
