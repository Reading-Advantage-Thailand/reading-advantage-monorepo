# Task 3 Semantic Candidate Review Remediation

**Track:** `apk_existing_core_cutover_20260727`
**Source review:** `review-task3-semantic-candidates.md`
**Remediated at:** `2026-07-27T19:47:40Z`
**Disposition:** Findings remediated; Task 3 remains in progress pending a fresh independent review and product-owner acceptance.

## Boundaries preserved

- Candidate mappings were not changed. `existing-core-cutover-semantic-candidates.ts` remains byte-identical to the reviewed source: git blob `2c5bf1b72571c1ddaa39a25407acff96ac40fcdb`, SHA-256 `8d33f785fed5487ac81dd7e6501d5b867cd5faa614274726fa8d3d299148a9d3`.
- `catalog.ts` remains SHA-256 `14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b`; `index.ts` remains SHA-256 `1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda`.
- No candidate was added to `cartridgeCatalog` or `cartridgeLoaders`. Candidate classification/status remain `per-title-semantic-adoption-candidate` / `candidate`, with `consumable: false`.
- This remediation records neither independent approval nor owner acceptance.

## Finding remediation

1. **Finding 4.1 — missing invariant 2 counterexample:** added the dedicated `fail-closed invariant 2: stale catalog/release hashes` block. It loads the accepted T11 catalog, mutates the catalog digest and matching release binding, then proves `createAcceptedSemanticAssetResolver` rejects before candidate materialization can occur.
2. **Finding 4.2 — stale count:** the candidate file now contains and passes 22 test cases; plan and metadata report `22/22`, replacing the stale `24/24` and interim `21/21` narratives.
3. **Finding 4.3 — weak tampered-resolver assertion:** the counterexample now independently tampers the resolved semantic key, physical descriptor path, and source-receipt binding. T11 rejects each mutation rather than merely proving one expected key is present.
4. **Finding 4.4 — vacuous duplicate-path assertion:** the assertion was replaced with a T11 selected-union materialization counterexample. Two distinct semantic keys resolve from the same source-receipt identity and materialization rejects the duplicate physical source.

The T11 resolver now validates that a resolved entry's key matches its owner binding, its path descriptor matches `key + extension`, and its source-receipt locator is non-empty. Selected-union materialization rejects distinct semantic keys sharing a physical path or source-receipt identity. Focused T11 tests cover these guards directly.

## Verification evidence

| Gate | Result |
|---|---|
| Focused standard/semantic/boundary Vitest (`semantic-product-bindings`, `standard-pack-release`, accepted-release integration, boundary checker tests) | 4 files, 19/19 passed |
| Focused candidate semantic Vitest | 1 file, 22/22 passed |
| Production standard-asset boundary checker | passed |
| Evidence-lineage + readiness pytest | 7/7 passed |
| Accepted-input checker | passed all four SHA-256 bindings; 3 capability inputs, 0 runtime contracts, 0 approved mappings, 85 blocked mappings, browser success false |
| Advantage Play Kit lint / typecheck / build | passed / passed / passed |
| Advantage Play Kit full tests | 41 files, 238/238 passed |
| Game Cartridges lint / typecheck / build | passed / passed / passed |
| Game Cartridges full tests | 24 passed; exactly 20 intentional Red failures remain in `existing-core-cutover.red.test.ts` because catalog/loaders/mechanic factories are deliberately absent |
| `git diff --check` | passed |

Changed remediation artifacts are content-bound as follows:

- `semantic-product-bindings.ts`: SHA-256 `937ea020f5ae2c5ede1b6c5795019d5459619e8bb47ba9add3f251f12f5fe121`
- `semantic-product-bindings.test.ts`: SHA-256 `e8c328e17df7522ef349616b3b3d7c2be8c0403ca5049722b0f845a969dca4d8`
- `existing-core-cutover.semantic-candidates.test.ts`: git blob `7233586fa66d2d4155a610129f7ddf3f4545f8fc`, SHA-256 `74cfc6e37a8e4b31ff6139ef663c8a05a9fe76d85dc838edd4809c58a2e78413`

## Remaining hold

Task 3 remains `[~]`. A fresh independent reviewer must inspect the remediated bytes and the product owner must explicitly accept the candidate mappings before any promotion, catalog/loader exposure, host cutover, or consumability claim.
