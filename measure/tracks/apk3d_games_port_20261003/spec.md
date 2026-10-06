# Spec: APK 3D story games port

## Goal

Move the story games of the Forge demo repository (`advantage-forge`) into the monorepo.
Primary Advantage students play them and earn XP through the existing completion path.

## Decisions

- Two new packages: `@reading-advantage/advantage-play-kit-3d` (runtime, stage, HUD, host)
  and `@reading-advantage/game-cartridges-3d` (games, registry, model packs, stories).
- The 3D games use their own registry. They do not enter `cartridgeCatalog`.
- The host is `startStoryGame` and `StoryGameHost`. `APKGameHost` stays unchanged.
- Model packs have no hash field. Provenance comes from `forgeCommit`.
- Story JSON and packs are static assets. `scripts/sync-assets.mjs` copies them into the app `public/`.
- Completion uses `recordGameCompletion` with game type `<gameId>-story`. The server computes XP.
- Story contracts (`story-input`, `evidence`) live in `game-contracts`.

## Out of scope

- Push, pull request, and deployment. The owner approves each.
- Challenge capabilities for story games.
- A lite edition with packs.
