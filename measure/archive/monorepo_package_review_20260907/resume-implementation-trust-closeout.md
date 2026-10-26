# Trust and release follow-up report

## Result

The Sales Mastery public constructor now requires the scoped Company Identity mode.
The removed legacy mode accepted a database and a direct Mastery port.
That mode bypassed trusted identity verification.

The governing specification requires Company Identity authorization and organization scope for every operation.
Both recorded Phase 2 reviews identify the public legacy constructor as a trust bypass.
The graph and repository search found no production caller for that constructor mode.
The existing trusted operation tests still cover all four public operation paths.

The Auth closeout test now uses recorded Git evidence for the resolved registry row.
The current registry can prune resolved rows under its 50-line policy.
Revision `7fdaf602cfe32aba264176efca9c4337e6954818` records the resolved row.
The current 50-line limit check remains active.

The APK release test derives the published receipt boundary from catalog locators.
It reconstructs the authentic receipt prefixes for the 43,075-asset accepted release.
It verifies every published path and locator against those receipt lines.
The test retains every digest and physical assertion.
No hash behavior changed.

## Files

- `packages/domain/src/sales-mastery.ts`
- `packages/auth/src/__tests__/phase-7-closeout.test.ts`
- `packages/advantage-play-kit/src/assets/standard-pack-release.integration.test.ts`
- `graph.db`

## Verification

- Sales trusted-boundary and projection tests: 24 passed.
- Sales focused ESLint: passed.
- Auth closeout tests: 13 passed.
- Auth focused ESLint: passed.
- APK release and acceptance integration tests: 2 passed.
- APK candidate parity: 46,447 assets passed.
- APK focused ESLint: passed.
- Code graph update: passed for four changed files.

The focused tests used these commands:

```text
node ../../node_modules/vitest/vitest.mjs run src/__tests__/sales-phase2-trusted-only.red.test.ts src/__tests__/sales-mastery-projection.test.ts --maxWorkers=1 --no-file-parallelism
node ../../node_modules/vitest/vitest.mjs run src/__tests__/phase-7-closeout.test.ts --maxWorkers=1 --no-file-parallelism
node ../../node_modules/vitest/vitest.mjs run src/assets/standard-pack-release.integration.test.ts src/assets/standard-pack-acceptance.integration.test.ts --maxWorkers=1 --no-file-parallelism
node --input-type=module -e 'import { verifyStandardPackParity } from "./scripts/verify-standard-pack-parity.mjs"; const result = await verifyStandardPackParity({ catalogPath: "/tmp/monorepo-review-apk-candidate-catalog.json" }); console.log(JSON.stringify(result));'
```

## Remaining work

The root task confirmed that the Domain type check passes after the Science repair.
No focused source or test failure remains in this assignment.

The named-cut track added 3,372 approved cuts to `IMPORT-RECEIPT.tsv`.
Its batch approvals cover the crops and pixel comparisons.
They do not accept a new standard-pack release identity.

The candidate uses 46,440 import rows and seven curated rows.
The added import rows contain these source archive counts:

- Fantasy Dreamland World: 937.
- Game Assets Extras: 682.
- EvoMonsters: 560.
- Commission Packs: 538.
- Farming Game World: 379.
- Tower Defense: 180.
- Sewers Tileset: 96.

The generator used the current import, curated, and license receipts.
It also used the complete current standard asset tree.

The saved candidate is `/tmp/monorepo-review-apk-candidate-catalog.json`.
It contains 46,447 assets under version `2026.07.23`.
Its catalog digest is `819fd29c3db62e180f3204a063a61e15b97b18946f9c5f51e0d827037e06430e`.
Its receipt digest is `83ba2cf10cd78f9bc31e0669b256773051a52886659a9ef14f44ccab6ddd69fe`.
Its artifact digest is `d225251ae246829481503bcc2c99949d9aa5dd21c4a85b7ec419568bea49b227`.
Exact parity passed for 46,446 images and one audio asset.

The published catalog and accepted records remain the historical 43,075-asset release.
They retain catalog digest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`.
They retain receipt digest `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9`.
They retain catalog artifact digest `ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932`.

The existing ingestion workflow requires an additive pinned release.
It also requires independent review and product-owner acceptance for the release identity.
The accepted record requires completed automated and browser QC gates.
No evidence accepts the 46,447-asset candidate or its reused historical version.
The release owner must assign a successor identity and complete those reviews.
The candidate remains unapproved existing work and does not block the published release checks.
