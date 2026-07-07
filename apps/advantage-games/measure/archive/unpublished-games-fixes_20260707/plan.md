# Track: Unpublished Games Fixes

*Created: 2026-07-07 · Type: Bug · Status: Complete*

Fixes for every issue in `UNPUBLISHED-GAMES-REPORT.md` (2026-07-07 review of the 17
unpublished games). See the report's "Fix log" section for full detail and verification
evidence.

## Tasks

- [x] griffin-riders-escape: re-arm rAF loop; re-measure stage after null-state mount
- [x] haunted-library: move tick out of setGameState updater (rAF storm)
- [x] abyssal-well + storm-castle-tower: hoist spawn bookkeeping out of updaters
- [x] realm-carver: `sentence.text` → `sentence.term`
- [x] alchemists-synthesis + wizard-vs-zombie: definite `85svh` game-frame height
- [x] storm-castle-tower: difficulty option `medium` → `normal`
- [x] i18n: en.ts entries (alchemists, archers, rune-forge); Thai back buttons → `backToGames` (8 pages)
- [x] gryphon-patrol stage centering; spellweavers-run orb clipping; label wrap=none ×3 games
- [x] ws-server: include `roomCode` in create_room ack (+ type)
- [x] Stale tests updated: route contracts ×2, alchemists page, storm/griffin difficulty,
      GameEndScreen strings, main-menu `/en` links, dungeon-liberator mock
- [x] ESLint jest globals for test files
- [x] Verification: tsc clean, jest green, per-game browser verification (native start click,
      FPS measurement, live state probe for abyssal)
