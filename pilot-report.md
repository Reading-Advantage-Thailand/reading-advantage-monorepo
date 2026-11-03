# Pilot report: dead code in packages/game-cartridges-3d

## Summary

- The package is `@reading-advantage/game-cartridges-3d`.
- dead-code-report.md marks 330 rows (641 symbols) safe for this package. All rows are exports or types. No safe row is a file.
- This change removes 329 rows in full and 1 row in part: 640 of 641 symbols.
- One symbol stays: `buildVaultBackdrop`. The kept list gives the reason.
- The change edits 220 files under `packages/game-cartridges-3d`. It edits no other file.
- package.json "exports" is unchanged. No entry file (`index.ts`, `manifest.ts`, `strings.en.ts`) changed.
- Dependents give the same pass and fail counts before and after.

## Method

- A script runs `git grep -w` for each symbol over the whole repository, without dead-code-report.md.
- Hits outside the package fall in measure, docs, and other apps.
- Code outside the package imports only the root entry, `src/index.ts`. That file names none of these symbols.
- Every outside hit is a word in prose or another package's own name.
- Inside the package, the TypeScript language service finds every reference in `src`, `tests`, and `qc`.
- A reference counts only when it imports the symbol through the flagged module.
- The script then edits each symbol in one of three ways:
  - 373 symbols: the file still uses the symbol, so the script drops only `export`.
  - 259 symbols: the script removes the name from a re-export list (`export { ... } from`).
  - 8 symbols: nothing uses the declaration, so the script deletes it.
- The script then drops imports that a file no longer names. It keeps blank lines and line layout.
- Lint gives the same result before and after: 0 errors, 15 warnings.

Deleted declarations:

- `headingOfDirection` in `src/abyssal-well/core/geometry.ts`
- `DRAGON_RIDER_EVENT_TYPES` in `src/dragon-rider/core/types.ts`
- `resultsOf` in `src/griffin-riders-escape/core/evidence.ts`
- `nextWaveOf` in `src/griffin-riders-escape/core/sim.ts`
- `ESCAPE_EVENT_TYPES` in `src/griffin-riders-escape/core/types.ts`
- `LIBRARY_EVENT_TYPES` in `src/haunted-library/core/types.ts`
- `DIRS` in `src/labyrinth/core/types.ts`
- `worldOfCell` in `src/realm-carver/view/geometry.ts`

## Rows kept

| Location | Symbol | Reason |
|---|---|---|
| `packages/game-cartridges-3d/src/shared/battle/stage3d.ts:25` | `buildVaultBackdrop` | Its comment names a consumer, `demo/bake.ts`, in the Forge repository. This repository does not hold that file. |

The same row's `STAGES` and `vaultPlaces` lose their `export`. The file still uses both.

## Risk: Forge owns these files

- `scripts/port-game.mjs` copies `src/<game>`, `src/shared`, and `tests/<game>` from the Forge repository.
- Its `--check` mode exits 1 when a package file differs from the Forge copy.
- After this change, `--check` reports a difference for each edited file. The next copy from Forge restores the exports.
- No test, build, or CI step runs `port-game.mjs`. The check needs a Forge checkout, which this session lacks.
- To keep the removal, make the same change in Forge. Otherwise revert these six commits.

## Commits

Each commit removes the rows of a set of games. The track `apk3d_games_port_20261003` owns every changed file.

1. Part 1 of 6: abyssal-well, alchemists-synthesis, archers-revenge, astral-mage, castle-defense (53 rows).
2. Part 2 of 6: devourer-slime, dragon-flight, dragon-rider, dungeon-liberator, enchanted-library (57 rows).
3. Part 3 of 6: griffin-riders-escape, griffin-sky-joust, gryphon-patrol, haunted-library (54 rows).
4. Part 4 of 6: hero-vs-zombie, labyrinth, magic-defense, paladins-twin-soul, potion-rush (57 rows).
5. Part 5 of 6: realm-carver, rpg-battle, rune-forge-chamber, rune-match (45 rows).
6. Part 6 of 6: shadow-gate-dungeon, shared, sorcerer-ziggurat, spellweavers-run, storm-castle-tower, village-guardian (64 rows).

## Commands

Setup:

- `git fetch --unshallow`: exit 0.
- `pnpm install --frozen-lockfile`: exit 0.

Check, run before and after the change:

```
./node_modules/.bin/turbo run build check-types test \
  --filter=@reading-advantage/game-cartridges-3d \
  --filter=...@reading-advantage/game-cartridges-3d --continue
```

`--continue` lets every task finish, so each run gives full counts. The run holds 50 tasks.
`primary-advantage` is the only package that depends on this package.

| Item | Before | After |
|---|---|---|
| Exit code | 2 | 2 |
| Tasks passed | 47 of 50 | 48 of 50 |
| game-cartridges-3d build, check-types | pass | pass |
| game-cartridges-3d test files | 128 passed | 128 passed |
| game-cartridges-3d tests | 2011 passed | 2011 passed |
| primary-advantage build, check-types | pass | pass |
| primary-advantage test files | 6 failed, 395 passed | 6 failed, 395 passed |
| primary-advantage tests | 4 failed, 2770 passed | 4 failed, 2770 passed |
| backend check-types | fail | fail |
| db check-types | fail | pass |

The same primary-advantage files fail in both runs:

- `app/[locale]/(student)/student/read/stories/[storyId]/[chapterNumber]/__tests__/chapter-page.test.tsx > chapter page > shows the chapter number, the title, the passage, and the player`
- `components/__tests__/component-deduplication-behavior.test.tsx [ components/__tests__/component-deduplication-behavior.test.tsx ]`
- `components/__tests__/loading-state-flow.behavior.test.tsx [ components/__tests__/loading-state-flow.behavior.test.tsx ]`
- `components/nav/__tests__/app-nav.test.tsx > nav item lists per role > keeps the current admin and SYSTEM menu items`
- `lib/__tests__/api-no-direct-db.test.ts > AC-1: no direct @reading-advantage/db imports in app/api routes > fails a NEW direct @reading-advantage/db import in a route.ts`
- `lib/__tests__/preview-guard-coverage.test.ts > preview guard coverage > guards every non-GET handler under the student API folders`

Notes on failures outside this package:

- `backend` and `db` are dependencies, not dependents. This change touches neither.
- `backend` check-types fails both times with the same error: TS2820, `"usd"` against `"THB" | "USD" | "JPY"`.
- `db` check-types fails in the first run only. Its test imports `domain/dist` and `sales-knowledge/dist`, which the first run had not built yet.
- The second run finds those dist files, so `db` passes. The change does not cause this difference.

Package checks after the change, run in `packages/game-cartridges-3d`:

- `pnpm run check-types`: exit 0.
- `pnpm run build`: exit 0.
- `eslint src/`: exit 0, 15 warnings before and after.
- `vitest run`: exit 0, 2011 of 2011 tests pass.

## Rows removed

Each row is a dead-code-report.md location. Row 25 of `shared/battle/stage3d.ts` is in part only.

| Kind | Location | Symbols |
|---|---|---|
| export | `src/abyssal-well/core/content.ts:15` | `isSentenceInput`, `descentSentencesOf` |
| export | `src/abyssal-well/core/evidence.ts:18` | `ABYSSAL_WELL_GAME_ID`, `evidenceItemsOf` |
| export | `src/abyssal-well/core/geometry.ts:30` | `headingOfDirection` |
| export | `src/abyssal-well/core/index.ts:5` | `descentSentencesOf`, `isSentenceInput`, `ABYSSAL_WELL_GAME_ID`, `evidenceItemsOf`, `headingOfDirection` |
| export | `src/alchemists-synthesis/core/content.ts:14` | `isVocabularyInput` |
| export | `src/alchemists-synthesis/core/evidence.ts:18` | `ALCHEMISTS_SYNTHESIS_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/alchemists-synthesis/core/index.ts:6` | `isVocabularyInput`, `choosable`, `ALCHEMISTS_SYNTHESIS_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/alchemists-synthesis/core/sim.ts:46` | `choosable` |
| export | `src/archers-revenge/core/content.ts:13` | `isVocabularyInput` |
| export | `src/archers-revenge/core/evidence.ts:17` | `ARCHERS_REVENGE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/archers-revenge/core/index.ts:3` | `isVocabularyInput`, `distinctTerms`, `ARCHERS_REVENGE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/astral-mage/core/content.ts:15` | `isSentenceInput` |
| export | `src/astral-mage/core/evidence.ts:17` | `ASTRAL_MAGE_GAME_ID`, `evidenceItemsOf` |
| export | `src/astral-mage/core/index.ts:7` | `isSentenceInput`, `castable`, `driftOf`, `ASTRAL_MAGE_GAME_ID`, `evidenceItemsOf` |
| export | `src/astral-mage/core/sim.ts:69` | `driftOf`, `castable` |
| export | `src/castle-defense/core/content.ts:13` | `isSentenceInput`, `SENTENCE_WORDS`, `sentencesOf`, `waveSentencesOf`, `distractorsOf` |
| export | `src/castle-defense/core/evidence.ts:17` | `CASTLE_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/castle-defense/core/index.ts:3` | `isSentenceInput`, `sentencesOf`, `waveSentencesOf`, `distractorsOf`, `SENTENCE_WORDS`, `CASTLE_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/devourer-slime/core/content.ts:14` | `isSentenceInput` |
| export | `src/devourer-slime/core/evidence.ts:17` | `DEVOURER_SLIME_GAME_ID`, `evidenceItemsOf` |
| export | `src/devourer-slime/core/index.ts:5` | `guardKindsOf`, `isSentenceInput`, `bubbleSpacingFor`, `DEVOURER_SLIME_GAME_ID`, `evidenceItemsOf` |
| export | `src/devourer-slime/core/sim.ts:108` | `bubbleSpacingFor` |
| export | `src/devourer-slime/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` |
| export | `src/dragon-flight/core/content.ts:13` | `isVocabularyInput` |
| export | `src/dragon-flight/core/evidence.ts:18` | `DRAGON_FLIGHT_GAME_ID`, `evidenceItemsOf` |
| export | `src/dragon-flight/core/index.ts:8` | `isVocabularyInput`, `gateCountFor`, `DRAGON_FLIGHT_GAME_ID`, `evidenceItemsOf` |
| export | `src/dragon-flight/core/sim.ts:65` | `gateCountFor` |
| export | `src/dragon-rider/core/content.ts:12` | `isVocabularyInput`, `wordsOf`, `decoysFor` |
| export | `src/dragon-rider/core/evidence.ts:17` | `DRAGON_RIDER_GAME_ID` |
| export | `src/dragon-rider/core/index.ts:3` | `wordsOf`, `rideWordsOf`, `decoysFor`, `gatesFor`, `isVocabularyInput`, `DRAGON_RIDER_GAME_ID` |
| export | `src/dragon-rider/core/types.ts:122` | `DRAGON_RIDER_EVENT_TYPES` |
| export | `src/dungeon-liberator/core/content.ts:14` | `isSentenceInput` |
| export | `src/dungeon-liberator/core/evidence.ts:18` | `DUNGEON_LIBERATOR_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/dungeon-liberator/core/index.ts:5` | `isSentenceInput`, `villagerKindsOf`, `DUNGEON_LIBERATOR_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/dungeon-liberator/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` |
| export | `src/enchanted-library/core/content.ts:14` | `isVocabularyInput`, `normalTerm` |
| export | `src/enchanted-library/core/evidence.ts:17` | `ENCHANTED_LIBRARY_GAME_ID`, `evidenceItemsOf` |
| export | `src/enchanted-library/core/index.ts:3` | `isVocabularyInput`, `normalTerm`, `SPIRIT_DOORS`, `ENCHANTED_LIBRARY_GAME_ID`, `evidenceItemsOf` |
| export | `src/enchanted-library/core/sim.ts:33` | `SPIRIT_DOORS` |
| export | `src/enchanted-library/qc/bot.ts:11` | `DANGER` |
| export | `src/enchanted-library/view/hall.ts:17` | `BOOK_COLORS` |
| export | `src/griffin-riders-escape/core/content.ts:15` | `isSentenceInput`, `SENTENCE_WORDS`, `sentencesOf`, `escapeSentencesOf` |
| export | `src/griffin-riders-escape/core/evidence.ts:18` | `GRIFFIN_RIDERS_ESCAPE_GAME_ID`, `evidenceItemsOf`, `resultsOf` |
| export | `src/griffin-riders-escape/core/index.ts:5` | `SENTENCE_WORDS`, `escapeOf`, `escapeSentencesOf`, `gatesFor`, `isSentenceInput`, `sentencesOf`, `stormLanesFor`, `wordPoolOf`, `nextWaveOf`, `GRIFFIN_RIDERS_ESCAPE_GAME_ID`, `evidenceItemsOf`, `resultsOf` |
| export | `src/griffin-riders-escape/core/sim.ts:54` | `nextWaveOf` |
| export | `src/griffin-riders-escape/core/types.ts:139` | `ESCAPE_EVENT_TYPES` |
| export | `src/griffin-riders-escape/qc/bot.ts:10` | `wantedLane` |
| export | `src/griffin-riders-escape/view/land-plan.ts:12` | `PATTERN`, `kindOf`, `PROPS` |
| export | `src/griffin-sky-joust/core/content.ts:14` | `isSentenceInput`, `SENTENCE_WORDS`, `joustSentencesOf` |
| export | `src/griffin-sky-joust/core/evidence.ts:17` | `GRIFFIN_SKY_JOUST_GAME_ID`, `evidenceItemsOf` |
| export | `src/griffin-sky-joust/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `joustSentencesOf`, `riderSpeedFor`, `targetWordOf`, `GRIFFIN_SKY_JOUST_GAME_ID`, `evidenceItemsOf` |
| export | `src/griffin-sky-joust/core/sim.ts:70` | `riderSpeedFor`, `targetWordOf` |
| export | `src/griffin-sky-joust/view/scene.ts:14` | `PX_PER_M`, `WORLD_W` |
| export | `src/gryphon-patrol/core/content.ts:15` | `isSentenceInput`, `SENTENCE_WORDS`, `patrolSentencesOf` |
| export | `src/gryphon-patrol/core/evidence.ts:17` | `GRYPHON_PATROL_GAME_ID`, `evidenceItemsOf` |
| export | `src/gryphon-patrol/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `patrolSentencesOf`, `enemyCountFor`, `GRYPHON_PATROL_GAME_ID`, `evidenceItemsOf` |
| export | `src/gryphon-patrol/core/sim.ts:53` | `enemyCountFor` |
| export | `src/gryphon-patrol/view/sky-plan.ts:8` | `GROUND_PROPS`, `rng` |
| export | `src/haunted-library/core/content.ts:14` | `isSentenceInput`, `ROOM_WORDS`, `roomSentencesOf` |
| export | `src/haunted-library/core/evidence.ts:17` | `HAUNTED_LIBRARY_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/haunted-library/core/index.ts:3` | `ROOM_WORDS`, `isSentenceInput`, `roomSentencesOf`, `visitOf`, `HAUNTED_LIBRARY_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/haunted-library/core/types.ts:153` | `LIBRARY_EVENT_TYPES` |
| export | `src/haunted-library/qc/bot.ts:10` | `REACH` |
| export | `src/haunted-library/view/library.ts:20` | `DOOR_SCALE` |
| export | `src/haunted-library/view2d/ground.ts:23` | `WALL_HEIGHT` |
| export | `src/hero-vs-zombie/core/content.ts:13` | `isVocabularyInput` |
| export | `src/hero-vs-zombie/core/evidence.ts:18` | `HERO_VS_ZOMBIE_GAME_ID`, `evidenceItemsOf` |
| export | `src/hero-vs-zombie/core/index.ts:5` | `isVocabularyInput`, `HERO_START`, `orbCountFor`, `HERO_VS_ZOMBIE_GAME_ID`, `evidenceItemsOf` |
| export | `src/hero-vs-zombie/core/sim.ts:46` | `HERO_START`, `orbCountFor` |
| export | `src/hero-vs-zombie/qc/bot.ts:19` | `LOOK_AHEAD`, `PREDICT_S`, `BLAST_RANGE`, `BLAST_ZOMBIES` |
| export | `src/labyrinth/core/content.ts:16` | `isSentenceInput` |
| export | `src/labyrinth/core/evidence.ts:18` | `LABYRINTH_GAME_ID`, `evidenceItemsOf` |
| export | `src/labyrinth/core/index.ts:5` | `isSentenceInput`, `cloneMaze`, `LABYRINTH_GAME_ID`, `evidenceItemsOf` |
| export | `src/labyrinth/core/types.ts:13` | `DIRS` |
| export | `src/labyrinth/view/geometry.ts:21` | `halfSize` |
| export | `src/labyrinth/view/maze.ts:17` | `WALL_HEIGHT` |
| export | `src/magic-defense/core/content.ts:13` | `isVocabularyInput` |
| export | `src/magic-defense/core/evidence.ts:17` | `MAGIC_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/magic-defense/core/index.ts:3` | `isVocabularyInput`, `distinctTerms`, `MAGIC_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/paladins-twin-soul/core/content.ts:13` | `isVocabularyInput` |
| export | `src/paladins-twin-soul/core/evidence.ts:17` | `TWIN_SOUL_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/paladins-twin-soul/core/index.ts:3` | `isVocabularyInput`, `TWIN_SOUL_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/potion-rush/core/content.ts:13` | `isSentenceInput`, `customerKindsOf` |
| export | `src/potion-rush/core/evidence.ts:17` | `POTION_RUSH_GAME_ID`, `evidenceItemsOf` |
| export | `src/potion-rush/core/index.ts:6` | `customerKindsOf`, `isSentenceInput`, `moodFor`, `patienceFor`, `beltSpeedFor`, `POTION_RUSH_GAME_ID`, `evidenceItemsOf` |
| export | `src/potion-rush/core/sim.ts:112` | `moodFor`, `patienceFor`, `beltSpeedFor` |
| export | `src/potion-rush/qc/bot.ts:11` | `cauldronFor` |
| export | `src/potion-rush/view2d/game.ts:56` | `layoutFor` |
| export | `src/realm-carver/core/content.ts:14` | `isSentenceInput` |
| export | `src/realm-carver/core/evidence.ts:17` | `REALM_CARVER_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/realm-carver/core/index.ts:6` | `isSentenceInput`, `monsterKindsOf`, `cellsOf`, `REALM_CARVER_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/realm-carver/core/sim.ts:103` | `cellsOf` |
| export | `src/realm-carver/view/geometry.ts:20` | `worldOfCell` |
| export | `src/rpg-battle/core/content.ts:12` | `isVocabularyInput` |
| export | `src/rpg-battle/core/evidence.ts:17` | `RPG_BATTLE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/rpg-battle/core/index.ts:3` | `isVocabularyInput`, `RPG_BATTLE_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/rpg-battle/view/hud.ts:18` | `ACTION_LOOK` |
| export | `src/rune-forge-chamber/core/content.ts:15` | `isSentenceInput`, `BLADE_WORDS`, `bladeSentencesOf` |
| export | `src/rune-forge-chamber/core/evidence.ts:18` | `RUNE_FORGE_CHAMBER_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/rune-forge-chamber/core/index.ts:4` | `BLADE_WORDS`, `bladeSentencesOf`, `isSentenceInput`, `answerOf`, `choosable`, `RUNE_FORGE_CHAMBER_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/rune-forge-chamber/core/sim.ts:51` | `answerOf`, `choosable` |
| export | `src/rune-match/core/content.ts:13` | `isVocabularyInput` |
| export | `src/rune-match/core/evidence.ts:17` | `RUNE_MATCH_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/rune-match/core/index.ts:4` | `isVocabularyInput`, `RUNE_MATCH_GAME_ID`, `evidenceItemsOf`, `scoreOf` |
| export | `src/rune-match/view/driver.ts:86` | `WORD_COLORS`, `HEAL_COLOR`, `SHIELD_COLOR` |
| export | `src/shadow-gate-dungeon/core/content.ts:15` | `isSentenceInput` |
| export | `src/shadow-gate-dungeon/core/evidence.ts:18` | `SHADOW_GATE_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/shadow-gate-dungeon/core/index.ts:7` | `isSentenceInput`, `SHADOW_GATE_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/shadow-gate-dungeon/qc/bot.ts:11` | `LOOK_AHEAD`, `PREDICT_S` |
| export | `src/shared/battle/stage2d.ts:22` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` |
| export | `src/shared/battle/stage3d.ts:25` | `STAGES`, `vaultPlaces`, `buildVaultBackdrop` |
| export | `src/sorcerer-ziggurat/core/content.ts:15` | `isSentenceInput`, `RITUAL_WORDS`, `sentencesOf`, `ritualSentencesOf` |
| export | `src/sorcerer-ziggurat/core/evidence.ts:17` | `SORCERER_ZIGGURAT_GAME_ID`, `evidenceItemsOf` |
| export | `src/sorcerer-ziggurat/core/index.ts:5` | `RITUAL_WORDS`, `isSentenceInput`, `ritualSentencesOf`, `sentencesOf`, `SORCERER_ZIGGURAT_GAME_ID`, `evidenceItemsOf` |
| export | `src/sorcerer-ziggurat/view/ziggurat.ts:16` | `LANE_X`, `CUBE_WIDTH`, `STEP_Y`, `STEP_Z`, `FOOT_Z` |
| export | `src/sorcerer-ziggurat/view2d/ground.ts:16` | `LANE_X`, `STEP_Y`, `STEP_Z`, `FOOT_Z` |
| export | `src/spellweavers-run/core/content.ts:14` | `isSentenceInput`, `SENTENCE_WORDS`, `runSentencesOf` |
| export | `src/spellweavers-run/core/evidence.ts:17` | `SPELLWEAVERS_RUN_GAME_ID`, `evidenceItemsOf` |
| export | `src/spellweavers-run/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `runSentencesOf`, `laneCountFor`, `SPELLWEAVERS_RUN_GAME_ID`, `evidenceItemsOf` |
| export | `src/spellweavers-run/core/sim.ts:50` | `laneCountFor` |
| export | `src/spellweavers-run/view/land-plan.ts:11` | `PATTERN` |
| export | `src/storm-castle-tower/core/content.ts:15` | `isSentenceInput` |
| export | `src/storm-castle-tower/core/evidence.ts:18` | `STORM_CASTLE_TOWER_GAME_ID`, `evidenceItemsOf` |
| export | `src/storm-castle-tower/core/index.ts:7` | `isSentenceInput`, `STORM_CASTLE_TOWER_GAME_ID`, `evidenceItemsOf` |
| export | `src/storm-castle-tower/view/tower.ts:14` | `COLUMN_WIDTH`, `ROW_HEIGHT` |
| export | `src/storm-castle-tower/view2d/tower.ts:16` | `COLUMN_WIDTH`, `ROW_HEIGHT`, `HALF_WALL` |
| export | `src/village-guardian/core/content.ts:14` | `isSentenceInput` |
| export | `src/village-guardian/core/evidence.ts:18` | `VILLAGE_GUARDIAN_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/village-guardian/core/index.ts:5` | `isSentenceInput`, `villagerKindsOf`, `VILLAGE_GUARDIAN_GAME_ID`, `SCORE`, `evidenceItemsOf` |
| export | `src/village-guardian/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` |
| export | `tests/abyssal-well/helpers.ts:15` | `loadStory` |
| export | `tests/alchemists-synthesis/helpers.ts:15` | `loadStory` |
| export | `tests/astral-mage/helpers.ts:15` | `loadStory` |
| export | `tests/castle-defense/helpers.ts:36` | `rightChoice` |
| export | `tests/devourer-slime/helpers.ts:15` | `loadStory` |
| export | `tests/dragon-flight/helpers.ts:15` | `loadStory` |
| export | `tests/dragon-rider/helpers.ts:10` | `loadStory` |
| export | `tests/dungeon-liberator/helpers.ts:15` | `loadStory` |
| export | `tests/enchanted-library/helpers.ts:16` | `loadStory` |
| export | `tests/griffin-riders-escape/helpers.ts:15` | `loadStory` |
| export | `tests/griffin-sky-joust/helpers.ts:16` | `loadStory`, `runUntil` |
| export | `tests/gryphon-patrol/helpers.ts:15` | `loadStory`, `aiming` |
| export | `tests/haunted-library/helpers.ts:16` | `loadStory` |
| export | `tests/hero-vs-zombie/helpers.ts:16` | `loadStory` |
| export | `tests/potion-rush/helpers.ts:15` | `loadStory` |
| export | `tests/realm-carver/helpers.ts:16` | `loadStory` |
| export | `tests/rune-forge-chamber/helpers.ts:15` | `loadStory` |
| export | `tests/shadow-gate-dungeon/helpers.ts:17` | `loadStory` |
| export | `tests/shared/answer-audio-helpers.ts:8` | `ANSWER_AUDIO_SESSION` |
| export | `tests/sorcerer-ziggurat/helpers.ts:15` | `loadStory` |
| export | `tests/spellweavers-run/helpers.ts:15` | `loadStory` |
| export | `tests/storm-castle-tower/helpers.ts:16` | `loadStory` |
| export | `tests/village-guardian/helpers.ts:15` | `loadStory` |
| type | `src/abyssal-well/core/content.ts:20` | `WellSentence` |
| type | `src/abyssal-well/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/abyssal-well/core/index.ts:12` | `WellSentence`, `AbyssalWellOptions`, `EvidenceStory` |
| type | `src/abyssal-well/core/sim.ts:46` | `AbyssalWellOptions` |
| type | `src/abyssal-well/core/types.ts:117` | `AbyssalWellEventType` |
| type | `src/abyssal-well/view/well.ts:17` | `WellScene` |
| type | `src/alchemists-synthesis/core/content.ts:19` | `WordSource`, `JarOption` |
| type | `src/alchemists-synthesis/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/alchemists-synthesis/core/index.ts:9` | `AlchemistsSynthesisInput`, `JarOption`, `WordSource`, `AlchemistsSynthesisOptions`, `EvidenceStory` |
| type | `src/alchemists-synthesis/core/sim.ts:33` | `AlchemistsSynthesisOptions` |
| type | `src/alchemists-synthesis/core/types.ts:102` | `AlchemistsSynthesisEventType` |
| type | `src/alchemists-synthesis/view/lab.ts:19` | `Lab` |
| type | `src/archers-revenge/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/archers-revenge/core/index.ts:4` | `ArchersRevengeOptions`, `EvidenceStory` |
| type | `src/archers-revenge/core/sim.ts:35` | `ArchersRevengeOptions` |
| type | `src/archers-revenge/core/types.ts:112` | `ArchersRevengeEventType` |
| type | `src/archers-revenge/view/driver.ts:53` | `PlayerOptions` |
| type | `src/archers-revenge/view2d/game.ts:24` | `ArchersRevenge2DTest` |
| type | `src/astral-mage/core/content.ts:20` | `CastingSentence` |
| type | `src/astral-mage/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/astral-mage/core/index.ts:11` | `AstralMageInput`, `CastingSentence`, `AstralMageOptions`, `EvidenceStory` |
| type | `src/astral-mage/core/sim.ts:60` | `AstralMageOptions` |
| type | `src/astral-mage/core/types.ts:127` | `AstralMageEventType` |
| type | `src/astral-mage/view/circle.ts:15` | `Circle` |
| type | `src/castle-defense/core/content.ts:30` | `SourceSentence` |
| type | `src/castle-defense/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/castle-defense/core/index.ts:3` | `SourceSentence`, `CastleDefenseOptions`, `EvidenceStory` |
| type | `src/castle-defense/core/sim.ts:38` | `CastleDefenseOptions` |
| type | `src/castle-defense/core/types.ts:151` | `CastleDefenseEventType` |
| type | `src/castle-defense/view/driver.ts:78` | `PlayerOptions` |
| type | `src/castle-defense/view2d/game.ts:25` | `CastleDefense2DTest` |
| type | `src/devourer-slime/core/content.ts:19` | `SentenceSource` |
| type | `src/devourer-slime/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/devourer-slime/core/index.ts:10` | `DevourerSlimeInput`, `SentenceSource`, `DevourerSlimeOptions`, `EvidenceStory` |
| type | `src/devourer-slime/core/sim.ts:92` | `DevourerSlimeOptions` |
| type | `src/devourer-slime/core/types.ts:133` | `DevourerSlimeEventType` |
| type | `src/dragon-flight/core/content.ts:18` | `WordSource` |
| type | `src/dragon-flight/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/dragon-flight/core/index.ts:10` | `WordSource`, `DragonFlightOptions`, `EvidenceStory` |
| type | `src/dragon-flight/core/sim.ts:55` | `DragonFlightOptions` |
| type | `src/dragon-flight/core/types.ts:130` | `DragonFlightEventType` |
| type | `src/dragon-flight/view/land.ts:17` | `Land` |
| type | `src/dragon-rider/core/content.ts:16` | `WordSource` |
| type | `src/dragon-rider/core/evidence.ts:19` | `EvidenceStory` |
| type | `src/dragon-rider/core/index.ts:3` | `WordSource`, `DragonRiderOptions`, `EvidenceStory` |
| type | `src/dragon-rider/core/sim.ts:43` | `DragonRiderOptions` |
| type | `src/dragon-rider/core/types.ts:119` | `DragonRiderEventType` |
| type | `src/dragon-rider/view/land.ts:14` | `Land` |
| type | `src/dungeon-liberator/core/content.ts:19` | `ShiftSentence` |
| type | `src/dungeon-liberator/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/dungeon-liberator/core/index.ts:10` | `DungeonLiberatorInput`, `ShiftSentence`, `DungeonLiberatorOptions`, `EvidenceStory` |
| type | `src/dungeon-liberator/core/sim.ts:92` | `DungeonLiberatorOptions` |
| type | `src/dungeon-liberator/core/types.ts:157` | `DungeonLiberatorEventType` |
| type | `src/dungeon-liberator/view/room.ts:13` | `Room` |
| type | `src/enchanted-library/core/content.ts:19` | `LibraryWord` |
| type | `src/enchanted-library/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/enchanted-library/core/index.ts:3` | `LibraryInput`, `LibraryWord`, `EnchantedLibraryOptions`, `EvidenceStory` |
| type | `src/enchanted-library/core/sim.ts:77` | `EnchantedLibraryOptions` |
| type | `src/enchanted-library/core/types.ts:138` | `LibraryEventType` |
| type | `src/enchanted-library/view/hall.ts:19` | `Hall` |
| type | `src/griffin-riders-escape/core/content.ts:20` | `SourceSentence` |
| type | `src/griffin-riders-escape/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/griffin-riders-escape/core/index.ts:16` | `EscapeInput`, `SourceSentence`, `EscapeOptions`, `EvidenceStory` |
| type | `src/griffin-riders-escape/core/sim.ts:46` | `EscapeOptions` |
| type | `src/griffin-riders-escape/core/types.ts:136` | `EscapeEventType` |
| type | `src/griffin-riders-escape/view/land-plan.ts:14` | `Kind`, `Placed` |
| type | `src/griffin-riders-escape/view/land.ts:18` | `Land` |
| type | `src/griffin-sky-joust/core/content.ts:19` | `SourceSentence` |
| type | `src/griffin-sky-joust/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/griffin-sky-joust/core/index.ts:10` | `JoustInput`, `SourceSentence`, `JoustOptions`, `EvidenceStory` |
| type | `src/griffin-sky-joust/core/sim.ts:58` | `JoustOptions` |
| type | `src/griffin-sky-joust/core/types.ts:103` | `JoustEventType` |
| type | `src/griffin-sky-joust/view/scene.ts:33` | `Sky` |
| type | `src/gryphon-patrol/core/content.ts:20` | `SourceSentence` |
| type | `src/gryphon-patrol/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/gryphon-patrol/core/index.ts:14` | `PatrolInput`, `SourceSentence`, `PatrolOptions`, `EvidenceStory` |
| type | `src/gryphon-patrol/core/sim.ts:45` | `PatrolOptions` |
| type | `src/gryphon-patrol/core/types.ts:164` | `PatrolEventType` |
| type | `src/gryphon-patrol/view/sky-plan.ts:33` | `Placed` |
| type | `src/gryphon-patrol/view/sky.ts:13` | `Sky` |
| type | `src/haunted-library/core/content.ts:19` | `LibrarySentence` |
| type | `src/haunted-library/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/haunted-library/core/index.ts:3` | `LibraryInput`, `LibrarySentence`, `HauntedLibraryOptions`, `EvidenceStory` |
| type | `src/haunted-library/core/sim.ts:69` | `HauntedLibraryOptions` |
| type | `src/haunted-library/core/types.ts:150` | `LibraryEventType` |
| type | `src/haunted-library/view/library.ts:29` | `Library` |
| type | `src/hero-vs-zombie/core/content.ts:18` | `WordSource`, `OrbOption` |
| type | `src/hero-vs-zombie/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/hero-vs-zombie/core/index.ts:10` | `OrbOption`, `WordSource`, `Grave`, `HeroVsZombieOptions`, `EvidenceStory` |
| type | `src/hero-vs-zombie/core/sim.ts:49` | `Grave`, `HeroVsZombieOptions` |
| type | `src/hero-vs-zombie/core/types.ts:183` | `HeroVsZombieEventType` |
| type | `src/hero-vs-zombie/view/churchyard.ts:12` | `Churchyard` |
| type | `src/labyrinth/core/content.ts:21` | `StorySentence` |
| type | `src/labyrinth/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/labyrinth/core/index.ts:10` | `LabyrinthInput`, `StorySentence`, `LabyrinthOptions`, `EvidenceStory` |
| type | `src/labyrinth/core/sim.ts:81` | `LabyrinthOptions` |
| type | `src/labyrinth/core/types.ts:172` | `LabyrinthEventType` |
| type | `src/labyrinth/view/geometry.ts:8` | `Ground`, `Piece`, `MazePieces`, `CameraFit` |
| type | `src/labyrinth/view/maze.ts:19` | `MazeSet`, `MazeOptions` |
| type | `src/magic-defense/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/magic-defense/core/index.ts:4` | `MagicDefenseOptions`, `EvidenceStory` |
| type | `src/magic-defense/core/sim.ts:42` | `MagicDefenseOptions` |
| type | `src/magic-defense/core/types.ts:128` | `MagicDefenseEventType` |
| type | `src/magic-defense/view/driver.ts:57` | `PlayerOptions` |
| type | `src/magic-defense/view2d/game.ts:24` | `MagicDefense2DTest` |
| type | `src/paladins-twin-soul/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/paladins-twin-soul/core/index.ts:4` | `TwinSoulOptions`, `EvidenceStory` |
| type | `src/paladins-twin-soul/core/sim.ts:36` | `TwinSoulOptions` |
| type | `src/paladins-twin-soul/core/types.ts:111` | `TwinSoulEventType` |
| type | `src/paladins-twin-soul/view/driver.ts:68` | `PlayerOptions` |
| type | `src/paladins-twin-soul/view2d/game.ts:23` | `TwinSoul2DTest` |
| type | `src/potion-rush/core/content.ts:18` | `ShiftSentence` |
| type | `src/potion-rush/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/potion-rush/core/index.ts:8` | `PotionRushInput`, `ShiftSentence`, `PotionRushOptions`, `EvidenceStory` |
| type | `src/potion-rush/core/sim.ts:61` | `PotionRushOptions` |
| type | `src/potion-rush/core/types.ts:154` | `PotionRushEventType` |
| type | `src/potion-rush/view/shop.ts:23` | `Shop` |
| type | `src/potion-rush/view2d/game.ts:111` | `PotionRush2DTest` |
| type | `src/realm-carver/core/content.ts:19` | `CampaignSentence` |
| type | `src/realm-carver/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/realm-carver/core/index.ts:10` | `CampaignSentence`, `RealmCarverInput`, `RealmCarverOptions`, `EvidenceStory` |
| type | `src/realm-carver/core/sim.ts:64` | `RealmCarverOptions` |
| type | `src/realm-carver/core/types.ts:173` | `RealmCarverEventType` |
| type | `src/realm-carver/view/geometry.ts:10` | `Ground`, `CameraFit` |
| type | `src/realm-carver/view/realm.ts:18` | `Realm` |
| type | `src/rpg-battle/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/rpg-battle/core/index.ts:4` | `RpgBattleOptions`, `EvidenceStory` |
| type | `src/rpg-battle/core/sim.ts:53` | `RpgBattleOptions` |
| type | `src/rpg-battle/core/types.ts:126` | `RpgBattleEventType` |
| type | `src/rpg-battle/view/driver.ts:65` | `PlayerOptions` |
| type | `src/rpg-battle/view/hud.ts:178` | `HeroId` |
| type | `src/rpg-battle/view2d/game.ts:33` | `RpgBattle2DTest` |
| type | `src/rune-forge-chamber/core/content.ts:20` | `SourceSentence` |
| type | `src/rune-forge-chamber/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/rune-forge-chamber/core/index.ts:12` | `RuneForgeChamberInput`, `SourceSentence`, `RuneForgeChamberOptions`, `EvidenceStory` |
| type | `src/rune-forge-chamber/core/sim.ts:36` | `RuneForgeChamberOptions` |
| type | `src/rune-forge-chamber/core/types.ts:108` | `RuneForgeChamberEventType` |
| type | `src/rune-forge-chamber/view/forge.ts:18` | `Forge` |
| type | `src/rune-match/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/rune-match/core/index.ts:18` | `Line`, `RuneMatchOptions`, `EvidenceStory` |
| type | `src/rune-match/core/sim.ts:53` | `RuneMatchOptions`, `Line` |
| type | `src/rune-match/core/types.ts:131` | `RuneMatchEventType` |
| type | `src/rune-match/view/driver.ts:75` | `PlayerOptions` |
| type | `src/rune-match/view2d/game.ts:23` | `RuneMatch2DTest` |
| type | `src/shadow-gate-dungeon/core/content.ts:20` | `DelveSentence` |
| type | `src/shadow-gate-dungeon/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/shadow-gate-dungeon/core/index.ts:12` | `DelveSentence`, `ShadowGateInput`, `ShadowGateOptions`, `EvidenceStory` |
| type | `src/shadow-gate-dungeon/core/sim.ts:81` | `ShadowGateOptions` |
| type | `src/shadow-gate-dungeon/core/types.ts:128` | `ShadowGateEventType` |
| type | `src/shadow-gate-dungeon/view/dungeon.ts:14` | `Dungeon` |
| type | `src/shared/answer-audio.ts:25` | `AnswerAudioDriver` |
| type | `src/shared/battle/stage2d.ts:40` | `PartyPlayer2D` |
| type | `src/shared/battle/stage3d.ts:23` | `StageDef` |
| type | `src/shared/battle/vault-places.ts:4` | `Place` |
| type | `src/sorcerer-ziggurat/core/content.ts:20` | `ClimbSentence` |
| type | `src/sorcerer-ziggurat/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/sorcerer-ziggurat/core/index.ts:13` | `ClimbSentence`, `ZigguratInput`, `ZigguratOptions`, `EvidenceStory` |
| type | `src/sorcerer-ziggurat/core/sim.ts:23` | `ZigguratOptions` |
| type | `src/sorcerer-ziggurat/core/types.ts:105` | `ZigguratEventType` |
| type | `src/spellweavers-run/core/content.ts:19` | `SourceSentence` |
| type | `src/spellweavers-run/core/evidence.ts:20` | `EvidenceStory` |
| type | `src/spellweavers-run/core/index.ts:12` | `SourceSentence`, `SpellweaversInput`, `SpellweaversOptions`, `EvidenceStory` |
| type | `src/spellweavers-run/core/sim.ts:42` | `SpellweaversOptions` |
| type | `src/spellweavers-run/core/types.ts:117` | `SpellweaversEventType` |
| type | `src/spellweavers-run/view/land-plan.ts:13` | `Kind` |
| type | `src/spellweavers-run/view/land.ts:16` | `Land` |
| type | `src/storm-castle-tower/core/content.ts:20` | `ClimbSentence` |
| type | `src/storm-castle-tower/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/storm-castle-tower/core/index.ts:12` | `ClimbSentence`, `StormCastleTowerInput`, `StormCastleTowerOptions`, `EvidenceStory` |
| type | `src/storm-castle-tower/core/sim.ts:66` | `StormCastleTowerOptions` |
| type | `src/storm-castle-tower/core/types.ts:160` | `StormCastleTowerEventType` |
| type | `src/village-guardian/core/content.ts:19` | `WatchSentence` |
| type | `src/village-guardian/core/evidence.ts:21` | `EvidenceStory` |
| type | `src/village-guardian/core/index.ts:10` | `VillageGuardianInput`, `WatchSentence`, `VillageGuardianOptions`, `EvidenceStory` |
| type | `src/village-guardian/core/sim.ts:100` | `VillageGuardianOptions` |
| type | `src/village-guardian/core/types.ts:166` | `VillageGuardianEventType` |
| type | `src/village-guardian/view/village.ts:16` | `Village` |
