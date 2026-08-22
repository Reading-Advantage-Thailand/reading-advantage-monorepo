# Plan — APK Common Look and Enforcement

Recorded retroactively. The owner directed these five steps in session, in this
order, after rejecting the framing that APK had met its three original goals:
common gameplay physics, common UX and flow, and common asset look.

## Phase 1 — Remove the unenforced version numbers

- [x] Delete the `compatibility` entry point and `DEVELOPER_KIT_API_VERSION`.
- [x] Delete the per-cartridge `version` field from the manifest and 28 titles.
- [x] Keep `APK_RUNTIME_API_VERSION` and the asset pack release, which are enforced.

## Phase 2 — Repair the tutorial runtime

- [x] Make the runtime advance sequentially, as its own policy declares.
- [x] Publish a snapshot when a step demonstrates.
- [x] Drive an optional `advanceFrame` across the declared demonstration window.
- [x] Convert `enchanted-library` from a one-tick teleport to a walked route.

## Phase 3 — Enforce the cartridge manifest at the load path

- [x] Add `validateRuntimeCartridgeManifest` and call it from `mountCartridge`.
- [x] Correct five traversal titles that declared Phaser features they never call.
- [x] Correct 15 capability ids that had lost the `capability:` namespace.
- [x] Rebase the scaffolding schema on the runtime schema; collapse the duplicate
      `semanticAssetRequirements` / `requiredAssetBindings` names.

## Phase 4 — Bind sprites to actors

- [x] Add `createActorSpriteLayer` to APK, with tests.
- [x] Convert all 18 wallpaper titles to load their own art and follow real actors.

## Phase 5 — Remove the wallpaper

- [x] Delete `standard-pack-scene-art.ts`, `preserveWorldArt`, and `apkOwnsWorldArt`.

## Phase 6 — Clear the lint gate

- [x] Clear 56 warnings across the kit, the cartridges, and the host app.
- [x] Record the `shadow-gate-dungeon` untranslated-strings defect in tech-debt.

## Verification

`advantage-play-kit` 506 tests, `game-cartridges` 621 tests, `advantage-games`
1759 tests. Lint and `tsc` clean in all three.
