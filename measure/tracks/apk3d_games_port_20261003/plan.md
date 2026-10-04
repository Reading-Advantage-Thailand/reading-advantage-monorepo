# Plan

## Phase 1: Packages

- [x] Add story contracts to `game-contracts`.
- [x] Add `advantage-play-kit-3d` with the host and the React wrapper.
- [x] Add `game-cartridges-3d` with eight games, packs, and stories.
- [x] Tests pass in both packages (kit 144, games 542).

## Phase 2: Primary Advantage

- [x] Route `student/games/story` and the link card.
- [x] Completion mapping with learning evidence.
- [x] Asset sync before dev and build.
- [x] Messages for en and th. Other locales use English text. 2026-10-04: all five locales carry the word adventures text (Thai in th, English in the others).

## Phase 3: Verification

- [x] Browser QC in 3D and 2D for all eight games (0 errors, 0 legacy requests).
- [ ] Repository graph rebuild and `architecture-enforcement` run. 2026-10-04: `architecture:check` fails on `origin/master` with the same stale manifest hash (manifest of 2026-09-08); this branch does not change it. `graph.db` stores main-checkout paths; refresh it on the main checkout after the merge. Caller impact is in the Forge track `game_platform_port_20260928`.
- [ ] Pull request, review, and deployment (the owner approves each).

## Phase 4: Legacy rewrites

- [x] All 21 legacy rewrites exist in the demo repository and in `game-cartridges-3d` (29 games in all; 28 student games since Monster Encounters left on 2026-10-04). Browser QC passes in 3D and 2D for each (software GL).
- [ ] `babel-architect` has no cartridge and no rewrite.
- [~] Real touch-device checks and layout tuning for the 21 new games. 2026-10-04: layout tuning is done for all 28 games with the phone QC (`qc/run.mjs --phone` 390 x 844 and `--phone-landscape` 844 x 390, touch events, 3D and 2D). The first run passed 112 of 112 without errors but showed covered labels, gate words off screen, Thai words broken inside a label, and unreadable Rune Match tiles. The fixes are in Forge bc930b5 and here in d5813fa68 (kit) and 11a203aad (games); the second run passed 112 of 112 with clean layouts. Open: a check on a real touch device (owner).

## Phase 5: Game input (owner, 2026-10-04)

- [x] Play-test edits of 3 October moved to Forge (Forge 89a4769) and came back through `port-game.mjs`. Forge stays the source of the games.
- [x] Replace the story picker. The games must read the student's saved vocabulary and sentences (`userWordRecords`, `userSentenceRecords`), chosen by memory state. The Forge track `game_flashcard_input_20261004` has the spec and the decisions. Done 2026-10-04: `GET /api/v1/apk/practice` (FSRS due order, at most 10 words and 8 sentences), locked games link to `/student/read`, Monster Encounters left the student games. Browser QC 28 of 28 in 3D and 2D; app QC on the local database passes.
- [x] Rebase on `master` when the input change is done. 2026-10-04: rebased on `origin/master` fe6aedc2b without the 18 `www` commits; the lockfile was regenerated with pnpm 11.8.0 (`--lockfile-only` gives no change); 25 old subjects now pass commitlint (lowercase subject and track id). Backup branch: `apk3d-games-port-prerebase-20261004`.

## Debt

- `kit-3d` keeps copies of `apk.ts` and `sprite-asset.ts` contracts. Replace them with imports.
- First-load budget of 4 MB has no model.
- `RuntimeCartridge` in `advantage-play-kit` has no 3D extension.
