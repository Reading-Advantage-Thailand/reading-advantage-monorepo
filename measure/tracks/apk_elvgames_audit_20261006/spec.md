# Spec — ElvGames asset audit and removal (APK and the apps)

**Status:** upcoming, created 2026-10-06 on the owner's instruction. Priority: HIGH (license).

## Why

The owner's rule (2026-10-06): no ElvGames asset anywhere in the application; every asset comes
from `advantage-forge`. The licensed ElvGames library requires the on-screen credit
"Pixel art assets by ElvGames" in every shipping app that uses it. Today the monorepo still
carries ElvGames art: `packages/advantage-play-kit/assets/standard/` (the full library), the
runtime preview pack `apps/primary-advantage/public/assets/apk/standard-pack-qc/` (808 KB), and
references from `packages/game-cartridges` (dragon-flight, castle-defense, the standard art
catalog tests) and `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx`. No app
shows the credit line today (grep 2026-10-06: zero hits). The Forge-side game rewrites use Forge
sprites, but the monorepo cartridges have not been switched.

## Scope

1. **Inventory.** Every file and reference to the ElvGames library in the monorepo: the APK
   asset tree, the public preview packs of every app, the cartridges, tests, and docs.
2. **Interim credit.** Until removal lands, every app that serves an ElvGames file shows
   "Pixel art assets by ElvGames" where a student can reach it (the Me page or a footer).
3. **Replacement.** Switch each cartridge that still reads ElvGames art to the Forge packs
   (`advantage-forge/out`, the APK 2D bake), one game per commit, with the QC shots.
4. **Removal.** Delete the preview packs and the standard library from the shipped apps; keep
   the license receipts in git history only. Add a CI gate that fails on any `assets/standard`
   or `standard-pack-qc` reference in app or cartridge code.
5. **Record.** Close the tech-debt row and update `docs/primary-rpg-skin.md` rule 1.

## Non-goals

The RPG skin pages (track `primary_rpg_skin_20261006`) never used ElvGames art; they are not in
scope. The Forge repository's own asset work is not in scope.

## Acceptance

- `grep -r "standard-pack-qc\|assets/standard\|ElvGames"` over `apps/` and `packages/` returns
  only license-history text, or nothing.
- Every game in Primary Advantage plays with Forge art in 2D and 3D (QC shots).
- The credit line is present while any ElvGames file ships, and removed with the last file.
