# Specification: Monorepo Tech-Debt Cleanup

## Overview

Resolve 7 remaining open tech-debt items spanning dependency alignment, linting, testing, i18n types, and visual regression coverage. This is the second round of tech-debt cleanup, following `tech_debt_resolution_20260503` which resolved 16 items.

## Functional Requirements

### FR1: Dependency Alignment

- **FR1.1** — Upgrade `react` to 19.2.x across the monorepo to resolve the `react-konva` peer dependency warning.
- **FR1.2** — Align `zustand` to a single major version (v4 or v5) across reading-advantage and advantage-games. Evaluate zustand v5 migration path for reading-advantage game components.

### FR2: Lint Cleanup

- **FR2.1** — Reduce advantage-games ESLint warnings to 0. Target categories: `prefer-const`, `no-undef`, `no-explicit-any`. Use surgical edits to minimize risk of regressions in game logic.
- **FR2.2** — Fix 4 pre-existing analytics lint errors in science-advantage (`class-analytics-overview.tsx`, `lesson-detail-analytics.tsx`, `student-detail-analytics.tsx`, `student-lesson-detail-analytics.tsx`).

### FR3: Test Stability

- **FR3.1** — Fix 3 flaky performance benchmark tests in vocabulary-games (`performance-benchmark.test.ts`). Adjust timing thresholds (`toBeLessThan`) to be realistic for CI/test environments, or refactor to use non-timing-based assertions.

### FR4: Shared i18n Types

- **FR4.1** — Define a canonical `Locale` type and message shape in `@reading-advantage/types` (or `@reading-advantage/config`).
- **FR4.2** — Update all apps (reading-advantage, primary-advantage, science-advantage, www-reading-advantage, advantage-games) to import from the shared type instead of defining local `Locale` types.

### FR5: Visual Regression Tests

- **FR5.1** — Add screenshot-based visual regression tests for Tailwind v4 migration. Cover at least one page per app to catch styling regressions. Use Playwright (already in tech stack) for screenshot capture.

## Non-Functional Requirements

- **NFR1** — All changes must pass `pnpm turbo run lint` with 0 errors and 0 warnings.
- **NFR2** — All changes must pass `pnpm turbo run build` with no build failures in any app.
- **NFR3** — All existing test suites must continue passing. No regression in test counts.
- **NFR4** — New tests added for each fix where applicable (>80% coverage target).
- **NFR5** — Changes must not break the dev experience (`pnpm dev` across apps).

## Acceptance Criteria

- [ ] `react` is unified at 19.2.x across all apps; react-konva peer warning gone.
- [ ] `zustand` is a single major version across the monorepo; no runtime errors in game components.
- [ ] advantage-games: `pnpm run lint` outputs 0 warnings (currently 6236).
- [ ] science-advantage: 4 analytics lint errors resolved.
- [ ] vocabulary-games: `performance-benchmark.test.ts` passes consistently on CI.
- [ ] `@reading-advantage/types` (or config) exports a shared `Locale` type consumed by all apps.
- [ ] At least 1 visual regression test per app (5 apps x 1 screenshot = 5 screenshots minimum).
- [ ] All 7 items marked `Resolved` in `tech-debt.md`.

## Out of Scope

- Prisma to Drizzle migration (separate track being planned).
- science-advantage non-auth Prisma cleanup (curriculum, lessons, gamification, classes).
- reading-advantage build remediation (covered by `reading_advantage_build_remediation_20260503`).
- primary-advantage stabilization (covered by `primary_advantage_stabilization_20260503`).
- science-advantage `ignoreBuildErrors` for Next.js workspace type mismatch (may be resolved by dependency alignment).
