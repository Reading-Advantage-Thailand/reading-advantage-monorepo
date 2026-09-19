# Acceptance Evidence: APK Legacy Catalog Completion

## Revision Scope

The verification covers the current shared worktree. The user did not request a commit.

## Automated Gates

| Gate | Command | Result |
|---|---|---|
| Cartridge coverage | `pnpm --filter @reading-advantage/game-cartridges test:coverage` | 46 files and 587 tests passed. Branch coverage was 81.54%. |
| Cartridge lint | `pnpm --filter @reading-advantage/game-cartridges lint` | Passed with no errors. |
| Cartridge types | `pnpm --filter @reading-advantage/game-cartridges check-types` | Passed. |
| Cartridge build | `pnpm --filter @reading-advantage/game-cartridges build` | Passed after generic-core removal. |
| Advantage Games tests | `pnpm --filter vocabulary-games exec jest --runInBand` | 199 suites and 1,783 tests passed. |
| Advantage Games lint | `pnpm --filter vocabulary-games lint` | Passed with warnings only. |
| Advantage Games types | `pnpm --filter vocabulary-games check-types` | Passed. |
| Advantage Games build | `pnpm --filter vocabulary-games build` | Passed with 147 generated static pages. |
| Advantage Play Kit tests | `pnpm --filter @reading-advantage/advantage-play-kit test` | 64 files and 497 tests passed. |
| Advantage Play Kit lint | `pnpm --filter @reading-advantage/advantage-play-kit lint` | Passed with four existing warnings. |
| Advantage Play Kit types | `pnpm --filter @reading-advantage/advantage-play-kit check-types` | Passed. |
| Advantage Play Kit build | `pnpm --filter @reading-advantage/advantage-play-kit build` | Passed. |
| Asset boundaries | `pnpm --filter @reading-advantage/advantage-play-kit check:standard-asset-boundaries` | Passed. |
| Asset parity | `pnpm --filter @reading-advantage/advantage-play-kit verify:standard-pack-parity` | Verified 43,075 assets. |
| Diff integrity | `git diff --check` | Passed. |

## Browser Evidence

The serial lifecycle matrix passed 30 cases before the sentence persistence case was added.
It covered all 28 cartridges, both viewports, tutorial actions, results, and replay cleanup.

The final authenticated command was:

```bash
TMPDIR=/home/daniebo/Desktop/reading-advantage-monorepo/.tmp PLAYWRIGHT_PORT=3319 PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/reading_advantage APK_E2E_AUTH_USERNAME=host-proof-reading-student APK_E2E_AUTH_PASSWORD=HOST-PROOF-001 pnpm exec playwright test tests/e2e/apk/public-cartridge-lifecycle.spec.ts --grep authenticated --workers=1
```

The command passed all three cases in 42.9 seconds.

- Unauthenticated APK routes failed closed.
- Magic Defense loaded student vocabulary and persisted completion.
- Castle Defense loaded student sentences and persisted completion.
- Both persistence responses returned status 200, a new activity ID, and server-calculated XP.

The final discovery command listed 31 lifecycle cases, including both authenticated input modes.

## Graph Evidence

The graph refresh command updated all tracked and untracked changed TypeScript files:

```bash
build-graph update ./graph.db $(git diff --name-only --diff-filter=ACMR HEAD -- '*.ts' '*.tsx') $(git ls-files --others --exclude-standard -- '*.ts' '*.tsx')
```

The final update processed 227 files. The graph contains 77 cartridge source files.
The graph contains zero nodes for `legacy-catalog-core`.

## Review Provenance

- Initial independent review `ses_fe7c57289ffefRM7YFDgEVzqbh` found three High issues.
- Bounded Green agents fixed explicit outcomes and catalog parity.
- Final independent review `ses_fe79823cbffeVonEx31DGHnSe2` found no unresolved Critical or High issues.
- The final review accepted the bounded server-authority contract.

## Cleanup Evidence

- Port `3319` has no listening process.
- The `apk-e2e-postgres` container is removed.
- Advantage Games browser scratch and test result directories are removed.
- Stale `legacy-catalog-core` build artifacts are removed.
