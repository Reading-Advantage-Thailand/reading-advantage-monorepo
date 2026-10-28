# Phase 2 Red Evidence — Binding Freeze

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 2 binding freeze
Phase base: `8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf`
Role base: `63da03a0e27e0c696df44f2a0285973b269d1cfd`

## Contract

The new focused test requires one strict dossier for each title at:

`measure/tracks/apk_legacy_traversal_cutover_20260727/phase2-binding-dossiers/<title_id>.json`

Each dossier binds:

- semantic role and state intent;
- Asset Contract v2 physical descriptor and accepted release;
- exact per-title source-manifest SHA-256;
- accepted traversal claim locators;
- one closed `reuse-canonical`, `ingest-canonical`, or `blocked` decision per role.

The contract rejects unknown Must-have adoption, stale releases, missing roles or descriptors, silent fallback, whole-pack delivery, app-local copies, and unsupported owner acceptance. Current valid controls use `blocked` because accepted suitability evidence does not authorize real asset adoption.

## Red result

The focused suite collected 7 tests. Two contract controls passed. Five title tests failed only because the five required dossiers are absent:

- `dragon-rider.json`
- `spellweavers-run.json`
- `shadow-gate-dungeon.json`
- `labyrinth-goblin-king.json`
- `griffin-riders-escape.json`

No test failed during module loading, JSON input loading, syntax transformation, or TypeScript compilation.

## Verification

- `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 1; 2 passed and 5 expected missing-dossier failures.
- `./node_modules/.bin/tsc --noEmit -p packages/game-cartridges/tsconfig.json` — exit 0.
- `./node_modules/.bin/eslint --config packages/game-cartridges/eslint.config.mjs packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 0.
- `./node_modules/.bin/prettier --check packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 0.
- `git diff --check -- packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 0.

No production cartridge code, source manifest, suitability source, registry, metadata, or unrelated path changed.

## Green handoff

Green must add exactly the five title dossiers, bind every role to accepted evidence, retain `blocked` for unsupported adoption, and rerun this focused test. Green must not add app-local copies, whole-pack delivery, silent fallback, or owner acceptance without a supported receipt.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 binding freeze
tests_collected: 7
controls_passed: 2
expected_failures: 5
failure_scope: five absent per-title traversal binding dossiers only
files_changed: packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts; measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md; measure/tracks/apk_legacy_traversal_cutover_20260727/phase2-binding-freeze-red-evidence-20260816.md; measure/tracks/apk_legacy_traversal_cutover_20260727/orchestration/phase2-mid-red-role.log
handoff: binding-freeze Green may add only the five strict dossiers and rerun the focused contract
END_MEASURE_AGENT_RESULT
