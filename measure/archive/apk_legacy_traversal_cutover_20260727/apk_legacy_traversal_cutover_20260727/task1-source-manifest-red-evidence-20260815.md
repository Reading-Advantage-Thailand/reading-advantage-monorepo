# Historical Task 1 Red Evidence — amended 2026-08-16

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 1 source/readiness manifests
Task: 1
Phase base: `c2e28e9e4f326fc056415abfe2d1876f16d48675`
Role base: `8113c2491dac4b7cc93bd9940f8d55b70cd83b5c`

This file records the pre-Green Red result. It is historical and does not describe the current Task 1 status.

## Contract result

The final focused Vitest run collected 13 tests. Eight support and mutation tests passed. Five title tests failed only for the missing exact per-title manifests:

- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/dragon-rider.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/spellweavers-run.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/shadow-gate-dungeon.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/labyrinth-goblin-king.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/griffin-riders-escape.json`

The eight passing support and mutation cases covered:

- All five exact title identities, assignment indices, source identities, and locators.
- All five archive-preferred inputs and accepted SHA-256 values.
- Active readiness status and the five-title authorization boundary.
- Accepted Batch A and Batch B evidence coverage.
- Complete accepted path denominators with `tracked-at-head` and `missing-at-head` entries.
- Git tracking, file existence, current-byte hashes, roles, classifications, and evidence locators for tracked entries.
- Accepted locators, exact paths, absent and untracked state, and no hash for missing entries.
- Empty, duplicate, omitted, wrong-hash, generated, unbound, and presence-state source-path falsifiers.
- Role, classification, evidence-locator, disposition, bound-byte, missing-input, duplicate-title, wrong-identity, and overclaim falsifiers.

The missing accepted paths are the five Spellweaver's Run paths and five Griffin Rider's Escape paths listed below:

- Spellweaver's Run: `apps/advantage-games/src/components/games/sentence/spellweavers-run/SpellweaversRunGame.tsx`, `apps/advantage-games/src/lib/games/spellweaversRun.ts`, `apps/advantage-games/src/lib/games/spellweaversRunConfig.ts`, `packages/game-cartridges/src/cartridges/spellweavers-run/scene.ts`, `packages/game-cartridges/src/cartridges/spellweavers-run/systems.ts`.
- Griffin Rider's Escape: `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape/page.tsx`, `apps/advantage-games/src/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx`, `apps/advantage-games/src/lib/games/griffinRidersEscape.ts`, `apps/advantage-games/src/lib/games/griffinRidersEscapeConfig.ts`, `packages/game-cartridges/src/cartridges/griffin-riders-escape/scene.ts`.

The new falsifiers reject lying about presence, a hash for missing bytes, omitted missing paths, and implementation or cutover authority from absence.

No readiness, gameplay, adoption, cutover, or retirement claim was added.

## Commands

- `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 1; expected Red with 8 passed and 5 named missing-manifest failures across 13 tests.
- `pnpm vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — the pnpm preflight entered install and ended with SIGTERM before Vitest collection.
- `./node_modules/.bin/tsc --noEmit -p packages/game-cartridges/tsconfig.json` — passed.
- `./node_modules/.bin/eslint --config packages/game-cartridges/eslint.config.mjs packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — passed.
- `./node_modules/.bin/prettier --check packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — passed.
- `git diff --cached --check -- packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md measure/tracks/apk_legacy_traversal_cutover_20260727/task1-source-manifest-red-evidence-20260815.md measure/tracks/apk_legacy_traversal_cutover_20260727/orchestration/task1-red-remediation-role.log` — passed.

## Scope protection

Before this remediation, relevant dirty paths were the strict test and this track's plan. Generated or ignorable paths included `.opencode/goals/**`, Codecamp Playwright reports, Codecamp test results, and Advantage Games test results. Unrelated user work included the durable-job plan and evidence, the Sales Mastery plan and evidence, and the backend job test. Those paths remain unchanged.

The five per-title manifests now exist in source commit `1e848bda09b6cfb16c8076447101553a247c4417`, and the focused command now passes.
Missing source paths remain `missing-at-head`; manifest completion does not make those sources available.
Task 1 is complete as evidence-only manifest work. Phase 2 remains incomplete.
