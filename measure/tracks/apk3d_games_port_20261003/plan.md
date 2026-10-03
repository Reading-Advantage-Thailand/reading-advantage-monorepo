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
- [x] Messages for en and th. Other locales use English text.

## Phase 3: Verification

- [x] Browser QC in 3D and 2D for all eight games (0 errors, 0 legacy requests).
- [ ] Repository graph rebuild and `architecture-enforcement` run.
- [ ] Pull request, review, and deployment (the owner approves each).

## Phase 4: Legacy rewrites

- [x] All 21 legacy rewrites exist in the demo repository and in `game-cartridges-3d` (29 games in all). Browser QC passes in 3D and 2D for each (software GL).
- [ ] `babel-architect` has no cartridge and no rewrite.
- [ ] Real touch-device checks and layout tuning for the 21 new games.

## Phase 5: Game input (owner, 2026-10-04)

- [x] Play-test edits of 3 October moved to Forge (Forge 89a4769) and came back through `port-game.mjs`. Forge stays the source of the games.
- [ ] Replace the story picker. The games must read the student's saved vocabulary and sentences (`userWordRecords`, `userSentenceRecords`), chosen by memory state. The Forge track `game_flashcard_input_20261004` has the spec and the open decisions.
- [ ] Rebase on `master` when the input change is done. The base `apk3d-port` carries 18 unrelated `www` commits.

## Debt

- `kit-3d` keeps copies of `apk.ts` and `sprite-asset.ts` contracts. Replace them with imports.
- First-load budget of 4 MB has no model.
- `RuntimeCartridge` in `advantage-play-kit` has no 3D extension.
