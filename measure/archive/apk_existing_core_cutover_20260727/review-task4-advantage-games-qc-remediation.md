# Remediation Evidence: Task 4 — Advantage Games QC Review Findings

- **Track:** `apk_existing_core_cutover_20260727`
- **Source review:** `measure/tracks/apk_existing_core_cutover_20260727/review-task4-advantage-games-qc.md`
- **Remediated at:** 2026-07-28T09:55:00Z
- **Status:** remediated-awaiting-fresh-independent-review-and-owner-acceptance
- **Owner approval:** not claimed and not implied. Task 4 remains in progress.

## Findings Addressed

| ID | Severity | Finding | Remediation |
|---|---|---|---|
| M-1 | Medium | Task-3 acceptance guard hard-asserted task 4 as pending `[ ]`, conflicting with the owner-authorized in-progress marker `[~]`. | `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py::test_plan_and_metadata_complete_only_task3` now validates that task 4 is lawfully `[~]`, rejects `[x]`, and fails closed if tasks 5/6/7 are not still `[ ]`. |
| L-1 | Low | Astral Mage QC wrong-hit score was not floored at zero; accepted historical source uses `Math.max(0, score - 25)`. | `packages/game-cartridges/src/existing-core-cutover-qc.ts` now floors the wrong-hit deduction. The package regression test asserts exact floor semantics. |
| L-2 | Low | Evidence `targeted_tests` label undercounted the touched Advantage Games suites (3 files / 7 tests, omitting `StandardPackQc.test.tsx`). | `task4-advantage-games-qc-evidence-v1.json` now records the four touched suites and 11 tests explicitly. |
| L-3 | Low | Scoped app graph counts drifted to 9012/10993 vs. the recorded 9001/10983 after `.next/types` regeneration. | Fresh `repo-graph` scans of `packages/game-cartridges` (539/606) and `apps/advantage-games` (9012/10993) were reproduced; the evidence now superseded the prior scan and documents the cause. |
| L-4 | Low | Metadata `deviation_notes` still described 20 intentional Red failures while the suite is now 61/61 green. | `metadata.json` `deviation_notes` was refreshed; the stale Red-failure wording was removed. |

## Changed Source Bindings (post-remediation SHA-256)

- `packages/game-cartridges/src/existing-core-cutover-qc.ts` → `6d1730bdb24f3c5effe0bb473d48487fcccf04c0a9964d0311a78d9253347951`
- `packages/game-cartridges/src/existing-core-cutover.red.test.ts` → `b4808c5d1109a183dc44e3ba2f052e8bb00e18e42b6bbfda489ff7fd87021a9f`
- `measure/tests/test_apk_existing_core_cutover_task3_acceptance.py` → `4cd5aba20b82fc888b4136af3c837c28891297185b193cbedb7d41434eeeed44`
- `measure/tracks/apk_existing_core_cutover_20260727/task4-advantage-games-qc-evidence-v1.json` → `7a9dae4d640f881f76c001be73315b74d07b19258226d01f09390c37adaba058`
- `measure/tracks/apk_existing_core_cutover_20260727/metadata.json` → bound through this remediation's `review_remediations` entry; hash excluded to avoid a circular self-reference.

## Gate Re-Runs (caches bypassed where applicable)

- **game-cartridges:** lint passed, `check-types` passed, build passed, tests **3 files / 61 passed**.
- **advantage-games:** lint **0 errors / 80 pre-existing warnings** (none in task-4 files), `tsc --noEmit` passed, targeted suites **4 files / 11 tests passed**.
- **Measure guards:** task-3 acceptance **6/6 passed**, task-4 evidence **7/7 passed**, evidence lineage **6/6 passed**, readiness passed.
- **Playwright Chromium (task-4 specs):** `CI=true pnpm --filter vocabulary-games exec playwright test tests/e2e/qc/existing-core-cartridges.spec.ts tests/e2e/qc/authoring-qc.spec.ts --project=chromium` → **4 passed** (2 task-4 tests).
- **Graph:** scoped fresh scans reproduced cartridges 539/606 and app 9012/10993; main `graph.db` incremental update remains OS-blocked and disclosed.
- **git diff --check:** no trailing whitespace or conflict markers.

## Disposition

Task-4 implementation and evidence are substantively verified and remediated. The QC registry remains confined to the explicit `./qc` subpath, the production catalog and root exports remain empty/non-exposing, the five-title selected union and asset bounds remain exact, and the per-title deterministic mechanics match the accepted claim locators. No Critical or High findings remain. Task 4 stays **in progress** pending fresh independent review and explicit product-owner acceptance.
