# Task 1 Red Evidence — 2026-08-15

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 1 source/readiness manifests
Task: 1
Phase base: `c2e28e9e4f326fc056415abfe2d1876f16d48675`
Role base: `f780ed6312a999c1d318fc0c0b04443c17b36764`

## Contract result

The final focused Vitest run collected 12 tests. Seven support and mutation tests passed. Five title tests failed only for the missing exact per-title manifests:

- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/dragon-rider.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/spellweavers-run.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/shadow-gate-dungeon.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/labyrinth-goblin-king.json`
- `measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/griffin-riders-escape.json`

The seven passing support and mutation cases covered:

- All five exact title identities, assignment indices, source identities, and locators.
- All five archive-preferred inputs and accepted SHA-256 values.
- Active readiness status and the five-title authorization boundary.
- Accepted Batch A and Batch B evidence coverage.
- Empty, duplicate, omitted, wrong-hash, generated, and unbound source-path falsifiers.
- Role, classification, evidence-locator, disposition, bound-byte, missing-input, duplicate-title, wrong-identity, and overclaim falsifiers.

No readiness, gameplay, adoption, cutover, or retirement claim was added.

## Commands

- `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 1; expected Red with 7 passed and 5 named missing-manifest failures across 12 tests.
- `pnpm vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — the pnpm preflight entered install and ended with SIGTERM before Vitest collection.
- `./node_modules/.bin/tsc --noEmit -p packages/game-cartridges/tsconfig.json` — passed.
- `./node_modules/.bin/eslint --config packages/game-cartridges/eslint.config.mjs packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — passed.
- `./node_modules/.bin/prettier --check packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — passed.
- `git diff --cached --check -- packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md measure/tracks/apk_legacy_traversal_cutover_20260727/task1-source-manifest-red-evidence-20260815.md measure/tracks/apk_legacy_traversal_cutover_20260727/orchestration/task1-red-remediation-role.log` — passed.

## Scope protection

Before this remediation, relevant dirty paths were the strict test and this track's plan. Generated or ignorable paths included `.opencode/goals/**`, Codecamp Playwright reports, Codecamp test results, and Advantage Games test results. Unrelated user work included the durable-job plan and evidence, the Sales Mastery plan and evidence, and the backend job test. Those paths remain unchanged.

Task 1 remains `[~]` until all five exact per-title manifests exist and this Red command turns green.
