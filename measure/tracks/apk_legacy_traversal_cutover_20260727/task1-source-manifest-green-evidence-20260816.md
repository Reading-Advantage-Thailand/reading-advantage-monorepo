# Task 1 Green Evidence — 2026-08-16

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 1 source/readiness manifests
Task: 1
Phase base: `c2e28e9e4f326fc056415abfe2d1876f16d48675`
Role base: `0d920669cb5a55ef5325272ee2d2e50aa0fa71a5`
Manifest source commit: `1e848bda09b6cfb16c8076447101553a247c4417`

## Output

Task 1 is complete as evidence-only manifest work.
The source commit adds five exact per-title manifests.
Each manifest preserves its accepted source-path denominator.
Tracked paths record current-byte SHA-256 values.
Missing paths record no SHA-256 value.
Missing paths remain `missing-at-head`; this evidence does not make them available.
Every path record uses the `evidence-only` disposition.
Every claims object remains false for the contract fields.
Phase 2 remains incomplete. Task 2 is the next executable binding work.

## Verification

- `./node_modules/.bin/vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 0; 13 passed.
- `./node_modules/.bin/tsc --noEmit -p packages/game-cartridges/tsconfig.json` — exit 0.
- `./node_modules/.bin/eslint --config packages/game-cartridges/eslint.config.mjs packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 0.
- `./node_modules/.bin/prettier --check measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests/*.json` — exit 0.
- `git diff --check -- measure/tracks/apk_legacy_traversal_cutover_20260727/legacy-source-manifests` — exit 0.

`bash measure/doctor.sh` exited 1 on pre-existing deprecated `[ ]` markers in unrelated active tracks. This lease does not include those plans.
