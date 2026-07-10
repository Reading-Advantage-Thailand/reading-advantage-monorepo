# APK Foundation Verification — 2026-07-10

Baseline commit: `ba9f01ec98945f62673516631ac98fd8e8b190ec`.

## Green evidence

| Surface | Command/evidence | Result |
|---|---|---|
| Contracts | package Vitest + coverage | 40 tests; 100% statements/lines, 95.12% branches |
| APK runtime | package Vitest + coverage | 17 tests; 83.43% statements, 90.09% lines |
| Cartridges | package Vitest + coverage | 20 tests; 97.32% statements, 98.98% lines |
| Architecture | `pnpm --filter @reading-advantage/game-contracts check:architecture` | Passed against all three APK package source trees |
| Package types/build | package `check-types` and `build` | Contracts, runtime, and cartridges passed |
| Package lint | package lint | Passed; runtime unused-import warning corrected |
| Advantage Games UI | focused Jest | QC lab + root link: 4 tests passed |
| Reading consumption | focused Jest | 2 tests passed |
| Primary consumption | focused Vitest | 2 tests passed |
| Advantage Games types | `pnpm --filter vocabulary-games check-types` | Passed |
| Production testbed | `pnpm --filter vocabulary-games build` | Passed; `/qc` emitted as a static route |
| Browser QC | focused Playwright at localhost | 3 tests passed: edition/cartridge switching, desktop/mobile canvas lifecycle and width, real keyboard completion/result mapping |
| Phaser version | workspace/version test | Exact `phaser: 4.2.1`; browser console identified Phaser v4.2.1 |

Browser QC also found and drove two fixes before the green run: unstable callback identities repeatedly recreated WebGL contexts, and resizing the Phaser logical world clipped mobile gameplay. The final adapter keeps a 960×540 logical world under `Scale.FIT`, and the QC host constrains canvas presentation without horizontal overflow.

## Bounded exceptions

- The Codex in-app and Chrome-extension browser clients both failed inside their shared startup library before navigation. Repository-owned Playwright browser QC was used after the plugin paths were attempted and the failure was reported during execution.
- Reading Advantage’s full type check exhausted the default 2 GB Node heap before producing a result. Its focused APK package-consumption test passed.
- Primary Advantage’s full type check reached existing app-wide schema/auth/type failures unrelated to the two new smoke files. Its focused APK test passed.
- `measure/doctor.sh` no longer reports this track, but still fails on deprecated task markers in concurrent `codecamp_interactive_media_diagrams_20260709` and `typescript7_native_migration_20260710` tracks. Those files were not changed.
- `measure/generate.sh` does not exist in this repository; generated-doc execution cannot be claimed.
- Explicit product-owner gameplay/visual approval for all six cartridge-edition combinations is still required. Successor cohort tracks and foundation closeout remain deferred to that decision.
