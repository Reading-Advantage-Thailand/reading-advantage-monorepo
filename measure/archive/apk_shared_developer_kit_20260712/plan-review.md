# T11 Independent Final-Review Remediation

## Findings and resolutions

- **Medium — stale test totals:** Updated the T11 plan and registry claims from
  the stale reviewed total to the metadata-bound `195 tests`. The hash-bound
  T10 inputs and metadata were not changed.
- **Medium — incomplete edition-free architecture scan:** Reworked
  `architecture-guards.test.ts` to resolve every file or directory listed by
  `EDITIONS_POLICY.editionFreeModules`, rather than scanning only
  `src/guards`. Added a temporary non-guards directory fixture containing a
  prohibited edition import; the fixture is removed in `finally`.
- **Low — missing `assertAcceptedInputs` branch coverage:** Added tests for all
  five failure conditions: capability count, runtime contracts, asset mappings,
  release version, and catalog digest. The production function now accepts an
  optional guard value so each branch can be tested without mutating the frozen
  hash-bound guard.
- **Low — ambiguous accepted-input output:** Changed the script output from
  `Accepted capability contracts` to `Accepted capability input files`.
- **Low — stale T11 acceptance evidence:** Corrected the Advantage Games
  targeted result to 8 tests across 3 suites and added the QC page test hash;
  refreshed all changed evidence hashes and the acceptance SHA reference in the
  T11 metadata, index, and plan.
- **Low — stale exemplar documentation:** Updated the exemplar header to
  describe its shared responsive/QC composition accurately.
- **Low — undocumented fixture export:** Added compliant JSDoc to `validResults`.
  The graph count remains explicitly labeled as the last bounded scan result
  because the incremental graph refresh timed out.
- **Low — API/package version ambiguity:** Labeled `2.0.0` as the
  owner-authorized API contract and retained `0.1.0` as the package distribution
  version in source, documentation, and acceptance artifacts.
- **Low — anonymous nested region:** Added a heading-based accessible label to
  the nested Standard Pack QC section.
- **Low — uncommitted acceptance state:** Recorded the intentional dirty-tree
  state and the required follow-up commit/reference refresh; no commit was made.

## Verification

- `CI=true pnpm exec vitest run src/guards/__tests__/architecture-guards.test.ts src/guards/__tests__/accepted-inputs.test.ts`
  — **26 tests passed in 2 files**.
- `pnpm run lint` — **passed** (`eslint src/`).
- `pnpm run check-types` — **passed** (`tsc --noEmit`).
- `pnpm run test -- --reporter=dot` — **35 files, 201 tests passed**.
- `pnpm run test:coverage` — **35 files, 201 tests passed**; statements
  **89.71%**, branches **77.42%**, functions **94.56%**, lines **93.14%**.
- `node scripts/check-accepted-inputs.mjs` — **passed**; all four SHA-256
  bindings verified, output includes `Accepted capability input files: 3`,
  runtime contracts `0`, approved mappings `0`, blocked mappings `85`, and
  `Browser success claimed: false`.

No browser, mobile, or performance success claims were added, and no
hash-bound input artifacts were modified.
