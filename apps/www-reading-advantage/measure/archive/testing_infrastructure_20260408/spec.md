# Track: Testing Infrastructure Setup

## Overview

The project currently has zero test files. The workflow.md mandates TDD with >80% code coverage, but no test runner is configured. This track installs and configures Vitest (unit/component tests) and Playwright (end-to-end tests), writes baseline tests for the highest-traffic components, and establishes CI enforcement so all future tracks can follow the TDD workflow.

The output of this track is a working test suite that all subsequent development can build on — not full coverage of the existing codebase, but a solid scaffold with documented conventions.

## Functional Requirements

1. **Vitest** is installed and configured as the unit/component test runner.
2. **@testing-library/react** and **@testing-library/user-event** are installed for component testing.
3. A `vitest.config.ts` file is present at the project root, compatible with Next.js 15 App Router.
4. A `jsdom` environment is configured for component tests.
5. **Playwright** is installed and configured for E2E tests with a `playwright.config.ts` at the project root.
6. At least one unit test exists for each of the following:
   - `HeroSection` component (`src/components/marketing/hero-section.tsx`)
   - `PricingTable` component (if it contains logic)
   - A utility function from `src/lib/` (at least one)
7. At least three Playwright E2E tests covering:
   - Homepage loads and renders a heading
   - Navigation links are functional (click Products → products page renders)
   - Contact page email CTA is present
8. A `coverage` script is added to `package.json` (`vitest run --coverage`).
9. CI pipeline (GitHub Actions) runs `npm run test` and `npm run test:e2e` on every PR.
10. Test conventions are documented in `measure/code_styleguides/testing.md`.

## Non-Functional Requirements

- Vitest runs in under 30 seconds for the initial suite.
- Playwright tests run in under 2 minutes headless on CI.
- No existing functionality is broken by adding the test tooling.
- All test files follow the naming convention `*.test.tsx` (unit/component) and `*.spec.ts` (E2E).
- Test files live alongside source files (`src/components/marketing/hero-section.test.tsx`) for unit tests and in a top-level `e2e/` directory for Playwright tests.

## Acceptance Criteria

- [ ] `npm test` (alias for `vitest run`) exits with code 0.
- [ ] `npm run test:coverage` produces a coverage report showing >0% for tested files.
- [ ] `npx playwright test` exits with code 0 against `http://localhost:3000`.
- [ ] GitHub Actions CI workflow runs both test commands on PR open.
- [ ] `measure/code_styleguides/testing.md` documents the test file naming convention, the import aliases available, and how to mock `next-international` in tests.

## Out of Scope

- Achieving >80% coverage of the full existing codebase — this track only scaffolds the infrastructure and writes baseline tests for 3-4 components.
- Visual regression testing (Percy, Chromatic, etc.) — deferred to a future track.
- Testing every locale variant — only default English locale tested in this track.
- Storybook or component catalogue setup.
