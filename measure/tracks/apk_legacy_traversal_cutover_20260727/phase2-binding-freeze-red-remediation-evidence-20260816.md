# Phase 2 Red Remediation Evidence — Binding Freeze

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 2 binding freeze
Current base: `ea806901d711d4a4215b4d3fafd6e2d3ba9d86fd`
Original phase base: `8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf`

## Immutable locator review

The accepted archive ledgers resolve the corrected claim pointers:

- Spellweaver's Run: `/13` resolves `SW-MOVE-001`.
- Shadow Gate Dungeon: `/claims/13` resolves `SGD-RESP-001`.
- Griffin Rider's Escape: `/claims/10` resolves `GRF-CART-001`.

Only those three pointers changed in `legacy-traversal-binding-freeze.test.ts`. Accepted archive evidence and all five candidate dossiers remain unchanged.

## Verification

- `CI=true pnpm exec vitest run packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 1; 7 tests collected, 4 passed, 3 failed on the unchanged candidate dossier locator values.
- `CI=true pnpm exec vitest run packages/game-cartridges/src/legacy-traversal-source-manifest.test.ts` — exit 0; 13 passed.
- `python3 -m unittest measure.tests.test_apk_legacy_traversal_cutover_source_readiness` — exit 0; 9 passed.
- `python -m unittest measure.tests.test_apk_legacy_traversal_cutover_source_readiness` — unavailable; `python` is not installed.
- `./node_modules/.bin/tsc --noEmit -p packages/game-cartridges/tsconfig.json` — exit 0.
- `./node_modules/.bin/eslint --config packages/game-cartridges/eslint.config.mjs packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 0.
- Prettier passed for the test and this evidence note. The existing plan indentation mismatch remains.
- `git diff --check -- packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts` — exit 0.

The corrected contract is not fully Green because the unchanged candidate dossiers retain the prior locator bytes. This remediation does not classify those candidate records as adopted evidence.

## Boundary and handoff

The five candidate dossiers still contain 15 blocked decisions and pending owner acceptance. This result grants no owner acceptance, asset adoption, ingestion, implementation, or cartridge Green status.

The same Green session may finalize evidence after the frozen candidate-locator disposition receives an explicit decision. No accepted archive or dossier file may change under this remediation lease.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete-with-green-handoff-blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 binding freeze remediation
counts: 3 pointers corrected; 7 focused tests; 4 passed; 3 locator failures; 13 manifest tests; 9 Python readiness tests
failures: unchanged candidate dossier locator values remain different from corrected accepted-ledger pointers
files_changed: packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts; measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md; measure/tracks/apk_legacy_traversal_cutover_20260727/phase2-binding-freeze-red-remediation-evidence-20260816.md
handoff: return to the same Green session for evidence finalization after explicit disposition of the frozen candidate-locator mismatch
authority: blocked candidates only; no owner acceptance, adoption, ingestion, implementation, or cartridge Green
END_MEASURE_AGENT_RESULT
