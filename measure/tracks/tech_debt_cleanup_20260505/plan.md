# Implementation Plan: tech_debt_cleanup_20260505

## Phase 1: Dependency Alignment

- [ ] Task: Upgrade react to 19.2.x across all apps
    - [ ] Read current react versions in each app's package.json
    - [ ] Bump react and react-dom to 19.2.x in all package.json files
    - [ ] Run `pnpm install` to update lockfile
    - [ ] Verify react-konva peer dependency warning is resolved
    - [ ] Run `pnpm turbo run build` to verify no build regressions

- [ ] Task: Align zustand to single version
    - [ ] Assess zustand v5 breaking changes vs reading-advantage game components
    - [ ] Write/update tests for game component store behavior (if none exist)
    - [ ] Migrate reading-advantage zustand stores to v5 API
    - [ ] Remove zustand v4 dependency from reading-advantage
    - [ ] Verify advantage-games and reading-advantage both build and test pass

- [ ] Task: Measure - User Manual Verification 'Dependency Alignment' (Protocol in workflow.md)

## Phase 2: Lint Cleanup

- [ ] Task: Fix advantage-games ESLint warnings
    - [ ] Run lint to get current warning counts by rule
    - [ ] Fix `prefer-const` warnings (replace `let` with `const`)
    - [ ] Fix `no-undef` warnings (add imports or globals configuration)
    - [ ] Fix `no-explicit-any` warnings (add proper TypeScript types)
    - [ ] Verify `pnpm turbo run lint --filter=advantage-games` outputs 0 warnings
    - [ ] Run advantage-games tests to verify no regressions

- [ ] Task: Fix science-advantage analytics lint errors
    - [ ] Identify the 4 analytics files with lint errors
    - [ ] Apply surgical fixes to each file
    - [ ] Verify `pnpm turbo run lint --filter=science-advantage` outputs 0 errors in analytics files
    - [ ] Run science-advantage tests to verify no regressions

- [ ] Task: Measure - User Manual Verification 'Lint Cleanup' (Protocol in workflow.md)

## Phase 3: Test Stability & i18n Types

- [ ] Task: Fix flaky perf benchmark tests
    - [ ] Read vocabulary-games `performance-benchmark.test.ts` to understand current thresholds
    - [ ] Adjust timing thresholds to realistic CI values or refactor to non-timing assertions
    - [ ] Run `pnpm turbo run test --filter=vocabulary-games` 3 times to verify stability
    - [ ] Confirm 0 flakes across 3 runs

- [ ] Task: Create shared i18n types
    - [ ] Write type tests for shared Locale type and message shape
    - [ ] Define canonical `Locale` type in `@reading-advantage/types` (or `config`)
    - [ ] Export from package; verify ESM exports work correctly
    - [ ] Update reading-advantage to import from shared type
    - [ ] Update primary-advantage to import from shared type
    - [ ] Update www-reading-advantage to import from shared type
    - [ ] Update science-advantage to import from shared type
    - [ ] Update advantage-games to import from shared type
    - [ ] Remove local `Locale` type definitions from each app
    - [ ] Verify `pnpm turbo run check-types` passes across all apps

- [ ] Task: Measure - User Manual Verification 'Test Stability & i18n Types' (Protocol in workflow.md)

## Phase 4: Visual Regression Tests

- [ ] Task: Add Playwright visual regression tests
    - [ ] Create screenshot test for advantage-games (main menu or game page)
    - [ ] Create screenshot test for science-advantage (dashboard or curriculum page)
    - [ ] Create screenshot test for reading-advantage (dashboard or reading page)
    - [ ] Create screenshot test for primary-advantage (dashboard page)
    - [ ] Create screenshot test for www-reading-advantage (homepage)
    - [ ] Add Playwright visual test configuration (baseline snapshots, threshold)
    - [ ] Run visual regression suite; verify all screenshots are captured
    - [ ] Document screenshot test running instructions

- [ ] Task: Measure - User Manual Verification 'Visual Regression Tests' (Protocol in workflow.md)

## Phase 5: Registry Update & Final CI Verification

- [ ] Task: Mark all 7 items Resolved in tech-debt.md
    - [ ] Update each item's Status from `Open` to `Resolved`
    - [ ] Add resolution date and track ID to Notes column
    - [ ] Verify tech-debt.md is <= 50 lines after updates

- [ ] Task: Final CI verification
    - [ ] Run `pnpm turbo run lint` — verify 0 errors and 0 warnings across all packages
    - [ ] Run `pnpm turbo run build` — verify all apps build without errors
    - [ ] Run `pnpm turbo run test` — verify all test suites pass
    - [ ] Run `pnpm turbo run check-types` — verify all type checks pass

- [ ] Task: Measure - User Manual Verification 'Registry Update & Final CI Verification' (Protocol in workflow.md)
