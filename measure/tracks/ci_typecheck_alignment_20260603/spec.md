# Specification: CI Alignment + tsc Blocker Resolution

## Overview

Resolve the 360 TypeScript errors masked by `apps/science-advantage/next.config.ts:25` (`ignoreBuildErrors: true`) and the dead/drifted `apps/science-advantage/.github/workflows/ci.yml` workflow. Add a `check-types` script to `apps/science-advantage/package.json` so the type-check layer is gated in CI. Delete the app-local CI workflow; add a `path-filter: apps/science-advantage/**` token to the monorepo root `.github/workflows/ci.yml`. Fix the 4 `react-hooks/immutability` lint errors and the 6 unused-vars warnings. Fulfills AGENTS.md §10.7 (no `ignoreBuildErrors`) and §10.8 (CI runs all gates: lint + test + check-types + build).

## Problem

Audited 2026-06-03. Findings F-1001 (Critical) + F-1002 (High) + F-1003 (Critical, protocol-level) + F-1204 (High) + F-1205 (High):

### F-1001 — `ignoreBuildErrors: true` masks 360 tsc errors
- `apps/science-advantage/next.config.ts:25` — `ignoreBuildErrors: true,`. Baseline: 360 tsc errors / 386 lines (per existing `measure/tech-debt.md` row `auth_strategy_review`).
- Decomposition:
  - **~354 errors**: testing-library matcher narrowing in `*.test.tsx` (need `@testing-library/jest-dom/vitest` types wired into `vitest.unit.setup.ts`)
  - **2 errors**: INTERN role widening in `lib/auth/session.ts:40,79`
  - **2 errors**: missing-sibling-module errors `lib/auth/{password,rate-limit}.test.ts`
  - **3 errors**: `ProcessEnv` narrowing in `vitest.integration.{global-setup,setup}.ts` + `lib/test/resolve-test-database-url.ts`
  - **4 errors**: next@16 duplicate-instance type identities
  - **4 errors**: misc

### F-1002 — App-local CI workflow uses `npm`, runs only lint + build, masks 360 tsc errors
- `apps/science-advantage/.github/workflows/ci.yml`:
  - Uses `cache: 'npm'`, `cache-dependency-path: package-lock.json`, `run: npm ci` — the monorepo is pnpm + `pnpm-lock.yaml`; no `package-lock.json` is committed at the app level.
  - Runs only `npm run lint` (no `test`, no `check-types`, no `build`).
  - References `NEXTAUTH_URL`/`NEXTAUTH_SECRET` env vars not in `.env.example` (drift from the 2026-05-26 auth migration).
- The monorepo root `.github/workflows/ci.yml` does not have a `path-filter: apps/science-advantage/**` token; the app-local workflow is the only gate.

### F-1003 — `graph.db` is empty (0 nodes, 0 edges, 0 files)
- Resolved by Track 0 (Protocol v1.1 + graph.db Rebuild). This track assumes Track 0 has shipped.

### F-1204 — `pnpm turbo run lint --filter=science-advantage` exits 1
- 4 `react-hooks/immutability` errors in `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186` (`fetchAnalytics` accessed before it is declared).
- 6 `@typescript-eslint/no-unused-vars` warnings in `lib/gamification/badges.ts:114,202` (`_userId`, `_triggerEvent`).

### F-1205 — `pnpm turbo run check-types` skips the app entirely; ~370 tsc errors when run directly
- `apps/science-advantage/package.json` has no `check-types` script. The `turbo.json` `check-types` task resolves to workspace-deps only and silently skips the app.
- Direct `npx tsc --noEmit` from `apps/science-advantage/` shows the same ~370-error list.

## Why

- AGENTS.md §10.7 + §10.8 have mandated type-check gating and CI coverage since the monorepo was scaffolded. This track is the implementation.
- The 360-error `ignoreBuildErrors: true` is the single biggest type-safety hole in the science-advantage app: any new error introduced by any track lands silently.
- The app-local `ci.yml` is dead code (no `package-lock.json` exists at the app root; `npm ci` would fail). It's a maintenance liability.

## Functional Requirements

### FR-1: Add `@testing-library/jest-dom/vitest` Types

- Add `@testing-library/jest-dom` to `apps/science-advantage/package.json` `devDependencies`. Pin version.
- Update `apps/science-advantage/vitest.unit.setup.ts` to import the types: `import '@testing-library/jest-dom/vitest';`.
- This resolves ~354 of the 360 tsc errors (testing-library matcher narrowing in `*.test.tsx`).

### FR-2: Fix `lib/auth/session.ts:40,79` INTERN Role Widening

- The INTERN role was added by the `0012_codecamp_intern_role.sql` migration but the `UserRole` type in `lib/auth/session.ts` does not include INTERN.
- Update the `UserRole` type to include `'INTERN'`.
- Update the session type's `user.role` field accordingly.
- Run `pnpm turbo run check-types --filter=science-advantage`; confirm the 2 errors are gone.

### FR-3: Add `lib/auth/{password,rate-limit}.test.ts` Siblings

- The TypeScript compiler complains about missing module `'./password'` and `'./rate-limit'` in the test files.
- Either (a) create the test files, or (b) adjust the `tsconfig.json` `include` to point to the actual file locations.
- **Recommended**: Track 3 (Argon2id) and Track 10 (Rate Limiter v2) will create the sibling files. For this track, the simplest fix is to add the test file shells (skipped tests) or update `tsconfig.json` to exclude them.

### FR-4: Type-Cast `process.env` Reads

- `lib/test/resolve-test-database-url.ts:13`, `vitest.integration.global-setup.ts:18`, `vitest.integration.setup.ts:14` use `process.env` directly.
- Cast to `NodeJS.ProcessEnv` or import the validated `env` from `lib/env.ts` (Track 7 prerequisite).
- Run `pnpm turbo run check-types`; confirm the 3 errors are gone.

### FR-5: Dedupe next@16 Instances

- 4 errors related to next@16 duplicate-instance type identities (`RequestInit`, `CurriculumUnitSummary`).
- These are workspace-wide version drift; `pnpm dedupe` should fix them.
- If `pnpm dedupe` does not resolve, pin a single `next@16.0.0` at the workspace root and use `pnpm.overrides` in `package.json`.

### FR-6: Misc Cleanup (4 errors)

- Specific 4 errors: per the existing `auth_strategy_review` row, they are "user-menu string|null, beforeEach import, xp.test comparison, mastery-profile overload".
- Inspect each; fix in place.

### FR-7: Add `check-types` Script

- Add to `apps/science-advantage/package.json`:
  ```json
  "scripts": {
    "check-types": "tsc --noEmit"
  }
  ```
- `pnpm turbo run check-types --filter=science-advantage` now resolves to the app's script (not just the workspace-deps).

### FR-8: Remove `ignoreBuildErrors: true`

- In `apps/science-advantage/next.config.ts:25`, change `ignoreBuildErrors: true` to `ignoreBuildErrors: false` (or remove the line; the default is `false`).
- Update the inline comment to remove the ~370-error enumeration (now resolved).
- Build: `pnpm turbo run build --filter=science-advantage` should pass with the new tsc-clean code.

### FR-9: Delete App-Local CI Workflow

- Delete `apps/science-advantage/.github/workflows/ci.yml`.
- The monorepo root `.github/workflows/ci.yml` is the only CI gate.

### FR-10: Add `path-filter: apps/science-advantage/**` to Monorepo Root CI

- Update `.github/workflows/ci.yml` (monorepo root) to add a `paths:` filter that includes `apps/science-advantage/**`.
- The job runs `pnpm turbo run {build,lint,test,check-types} --filter=science-advantage`.
- Verify the existing steps (config-drift, pnpm install, etc.) cover the app.

### FR-11: Fix 4 `react-hooks/immutability` Errors

- In `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`, the `fetchAnalytics` function is accessed before it is declared.
- Lift the function declaration above the `useEffect` (or wrap in `useCallback`/`useMemo` if appropriate).
- Run `pnpm turbo run lint --filter=science-advantage`; confirm 0 errors.

### FR-12: Silence 6 Unused-Var Warnings

- In `lib/gamification/badges.ts:114,202`, the `_userId` and `_triggerEvent` parameters are unused (the underscore prefix is a convention, but the rule still warns).
- Either (a) remove the parameters if they're truly unused, or (b) add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the line.
- Run `pnpm turbo run lint --filter=science-advantage`; confirm 0 warnings.

## Non-Functional Requirements

- **Zero `ignoreBuildErrors`** in `apps/science-advantage/next.config.ts`.
- **Zero app-local `.github/workflows/`** in any `apps/*/`.
- **All 4 CI gates** (lint, test, check-types, build) run on every PR touching `apps/science-advantage/**`.
- **Lint + type-check + build** green for `apps/science-advantage`.
- **`pnpm turbo run {build,lint,test,check-types} --filter=science-advantage`** all exit 0.

## Acceptance Criteria

1. `@testing-library/jest-dom/vitest` types wired; ~354 testing-library matcher narrowing errors gone.
2. `lib/auth/session.ts:40,79` INTERN role widening fixed.
3. `lib/auth/{password,rate-limit}.test.ts` siblings added (or tsconfig adjusted).
4. 3 `ProcessEnv` narrowing errors fixed.
5. 4 next@16 duplicate-instance errors fixed (`pnpm dedupe`).
6. 4 misc errors fixed.
7. `apps/science-advantage/package.json` has `"check-types": "tsc --noEmit"`.
8. `apps/science-advantage/next.config.ts:25` has `ignoreBuildErrors: false` (or removed).
9. `apps/science-advantage/.github/workflows/ci.yml` deleted.
10. `.github/workflows/ci.yml` (monorepo root) has `paths: apps/science-advantage/**` filter.
11. 4 `react-hooks/immutability` errors fixed.
12. 6 unused-var warnings silenced.
13. `pnpm turbo run check-types --filter=science-advantage` exits 0.
14. `pnpm turbo run lint --filter=science-advantage` exits 0.
15. `pnpm turbo run test --filter=science-advantage` exits 0.
16. `pnpm turbo run build --filter=science-advantage` exits 0.

## Out of Scope

- Migrating other apps' CI to the same pattern (reading-advantage, primary-advantage, etc.) — separate per-app tracks.
- Adding more aggressive lint rules (e.g. `no-explicit-any`, `prefer-const`) — out of scope.
- Refactoring `lib/auth/session.ts` (Track 3 deletes it as part of the Argon2id + Auth Flatten work).
- The 360 → 0 tsc error count is approximate; the actual number is verified at runtime.

## Constraints & Risks

- **Risk: Track 3 (Argon2id) deletes `lib/auth/session.ts`; the INTERN role fix in FR-2 must be coordinated.** Mitigation: this track fixes the `UserRole` type in `lib/enums.ts` (or wherever the central role type is); the consumer in `lib/auth/session.ts` is updated but the file is deleted by Track 3.
- **Risk: `pnpm dedupe` may break other apps' resolutions.** Mitigation: run `pnpm dedupe --check` first; only apply if it's a no-op for the rest of the monorepo.
- **Risk: The 4 `react-hooks/immutability` errors may be masking a real bug in `student-lesson-detail-analytics.tsx`.** Mitigation: read the function; if there's a real ordering issue, fix it properly. If the warning is spurious, suppress with `// eslint-disable-next-line` and a comment explaining why.
- **Cross-track dependency**: Track 0 (graph.db rebuild) should be in flight or complete before this track's CI gate is meaningful.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 10 (F-1001, F-1002, F-1003), §Section 12 (F-1203, F-1204, F-1205)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 11
- `measure/tech-debt.md` row `auth_strategy_review` (existing baseline)
- `apps/science-advantage/next.config.ts:25` (the `ignoreBuildErrors: true` line)
- `apps/science-advantage/vitest.unit.setup.ts` (where the jest-dom types wire in)
- `apps/science-advantage/.github/workflows/ci.yml` (the dead/drifted workflow)
- `.github/workflows/ci.yml` (the monorepo root, to add the path filter)
