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

- [x] Browser QC in 3D for the first seven games.
- [ ] Browser QC in 3D for the last game and in 2D for all games.
- [ ] Repository graph rebuild and `architecture-enforcement` run.

## Phase 4: Legacy rewrites

- [ ] rpg-battle, paladins-twin-soul, village-guardian (agents active).
- [ ] The other 18 legacy games (see `docs/apk-2d3d-program.md` in the demo repository).

## Debt

- `kit-3d` keeps copies of `apk.ts` and `sprite-asset.ts` contracts. Replace them with imports.
- First-load budget of 4 MB has no model.
- `RuntimeCartridge` in `advantage-play-kit` has no 3D extension.
