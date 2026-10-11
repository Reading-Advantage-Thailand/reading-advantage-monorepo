# Spec — Legacy games removal (Primary first)

**Status:** owner direction 2026-10-06 ("There should be no old games in the repo at all. Only our
new games which are already complete and using the new assets."). Plan agreed with the Forge
session (Forge track `legacy_games_removal_20261006`, F1 done in Forge 194899ac and 9ab1938c and
ported as apk3d-games-port d292c1186). Tutor Advantage is out of scope: the owner's developer moves
it later with Primary Advantage as the model, so the Primary game pages must stay clean and
documented.

## Problem

The 28 student games of `@reading-advantage/game-cartridges-3d` are complete, but the class
challenges, the quest battle, the weekly quest templates, the reward rules, the demo launch, and
the reward panels still run only through the legacy `@reading-advantage/game-cartridges` host.
Monster Encounters stays out (a later teacher-led lesson game).

## Requirements

- M1 (before the cutover): one Primary host for the new games with challenge runs (server seed and
  content as the APK VocabularyInput, helper off, `challengeRunId`), the reward panels, the demo
  launch, the briefing phase, the quest battle callback, and the avatar on every page.
  `resolveGameCapability` reads `manifest.challenge` from the 3D registry.
- M2 (before the cutover): quest templates, reward rules, and challenge capabilities name
  `hero-vs-zombie`, `dragon-flight`, `dragon-rider` at version `2026-10-06.1`; one alias map keeps
  old completions counting (`wizard-vs-zombie` → `hero-vs-zombie`, `labyrinth-goblin-king` →
  `labyrinth`); `grantCompletionCosmetics` runs for new-game completions. The Echo Staff stays
  unearnable until Forge F2 (answer audio) ships (owner decision 2026-10-06).
- Docs with M1: `docs/primary-games-integration.md` (host, launch context, completions and XP,
  challenges and the quest battle, reward pieces, asset sync).
- M3 (after the cutover): Reading Advantage and Advantage Games get a practice input source, the
  new game pages, and teacher challenge pages on the Primary model.
- M4 (after the cutover): old links redirect; `game-cartridges`, the legacy-only host code, the
  host-proof and QC pages, and the ElvGames assets go.

## Out of scope

Forge F2 (read-to-select-audio in the three games), Tutor Advantage.
