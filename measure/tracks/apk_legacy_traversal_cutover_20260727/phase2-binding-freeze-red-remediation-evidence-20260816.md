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

## Final Red remediation — Spellweaver input pointer

The accepted Spellweaver ledger resolves `/28` to `SW-INPUT-002` and `/29` to `SW-RESP-003`. The test now uses `/28`. The archive and all five dossiers remain unchanged.

The final focused run, manifest suite, Python readiness, TypeScript, lint, Prettier, and diff results follow this note.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: pending-verification
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 final accepted-evidence pointer remediation
handoff: same Green session for final evidence disposition
authority: blocked candidates only; no owner acceptance, adoption, ingestion, implementation, or cartridge Green
END_MEASURE_AGENT_RESULT

## Final verification result

The focused contract passed 6/7. Its only failure is the unchanged `spellweavers-run.json` decision pointer `/29`; the archive resolves `/29` to `SW-RESP-003`, while `/28` resolves `SW-INPUT-002`.

The manifest suite passed 13/13. Python readiness passed 9/9 with `python3`. TypeScript, ESLint, and diff checks passed. Prettier passed for the test and evidence note; the plan retains its pre-existing indentation warning.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete-with-green-handoff-blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 final accepted-evidence pointer remediation
counts: 1 pointer corrected; 7 focused tests; 6 passed; 1 superseded dossier-pointer failure; 13 manifest tests; 9 Python readiness tests
failures: only spellweavers-run.json retains the superseded /29 pointer
files_changed: packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts; measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md; measure/tracks/apk_legacy_traversal_cutover_20260727/phase2-binding-freeze-red-remediation-evidence-20260816.md
handoff: same Green session for final evidence disposition
authority: blocked candidates only; no adoption, owner acceptance, implementation, or cutover claim
END_MEASURE_AGENT_RESULT

## Follow-up Red remediation — accepted-evidence pointers

The accepted archive ledgers verify these further pointers:

- Spellweaver's Run: `/37` resolves `SW-CART-001`.
- Shadow Gate Dungeon: `/claims/14` resolves `SGD-RESULT-001`.
- Griffin Rider's Escape: `/claims/8` resolves `GRF-INPUT-001`.

The test updates both Griffin references to `GRF-INPUT-001`. The accepted archives and all five candidate dossiers remain unchanged.

The follow-up focused contract collected 7 tests, passed 4, and failed only on the three superseded dossier pointers. The manifest suite passed 13/13. Python readiness passed 9/9. TypeScript, ESLint, and diff checks passed. Prettier passed for the test and evidence note; the plan retains its pre-existing indentation warning.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete-with-green-handoff-blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 accepted-evidence pointer remediation
counts: 3 archive pointer groups corrected; 7 focused tests; 4 passed; 3 superseded dossier-pointer failures; 13 manifest tests; 9 Python readiness tests
failures: only unchanged candidate dossier pointer values remain superseded
files_changed: packages/game-cartridges/src/legacy-traversal-binding-freeze.test.ts; measure/tracks/apk_legacy_traversal_cutover_20260727/plan.md; measure/tracks/apk_legacy_traversal_cutover_20260727/phase2-binding-freeze-red-remediation-evidence-20260816.md
handoff: same Green session for final evidence disposition
authority: blocked candidates only; no owner acceptance, adoption, ingestion, implementation, or cartridge Green
END_MEASURE_AGENT_RESULT
