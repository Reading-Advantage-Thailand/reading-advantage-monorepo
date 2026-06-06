# Plan: CI Alignment + tsc Blocker Resolution

> TDD-light. Each FR has a verification step (`pnpm turbo run {check-types,lint,test,build} --filter=science-advantage` exits 0). The 360 tsc errors are resolved by the underlying 6 root causes; each is a small, isolated fix.

## Phase 0: Setup

- [~] Task: Confirm `pnpm turbo run check-types --filter=science-advantage` currently exits with the ~370-error list (baseline). [Red-phase test in `apps/science-advantage/lib/ci-gates/ci-gates.test.ts` asserts exit 0 — currently fails with 617 errors per `test-strategy.md` §0.]
- [~] Task: Confirm `pnpm turbo run lint --filter=science-advantage` currently exits 1 with 4 errors + 6 warnings (baseline). [Red-phase test in same file asserts exit 0 — currently fails with 4 errors + 6 warnings.]
- [~] Task: Coordinate with Track 3 (Argon2id + Auth Flatten) — `lib/auth/session.ts` is deleted; FR-2 must land first or coordinate the type change. [Coordination test in same file asserts `Role` from `@reading-advantage/auth` includes `INTERN` — currently passes (already widened in `packages/auth/src/roles.ts`); serves as regression guard so P2's fix in the canonical source remains intact.]

## Phase 1: Add `@testing-library/jest-dom/vitest` Types

- [ ] Task: Add `@testing-library/jest-dom` to `apps/science-advantage/package.json` `devDependencies`. Pin to a version compatible with `@testing-library/react@^16.3.0`.
- [ ] Task: `pnpm install` from monorepo root; verify install.
- [ ] Task: Update `apps/science-advantage/vitest.unit.setup.ts` to add `import '@testing-library/jest-dom/vitest';` at the top.
- [ ] Task: Run `pnpm turbo run check-types --filter=science-advantage`; expect ~354 errors gone (down from 360).

## Phase 2: Fix `lib/auth/session.ts:40,79` INTERN Role Widening

- [ ] Task: Find the central `UserRole` type (likely `packages/auth/src/roles.ts` or `lib/enums.ts`).
- [ ] Task: Add `'INTERN'` to the type union.
- [ ] Task: Update any consumer types that use `UserRole`.
- [ ] Task: Run `pnpm turbo run check-types --filter=science-advantage`; expect 2 errors gone.

## Phase 3: Add `lib/auth/{password,rate-limit}.test.ts` Siblings

- [ ] Task: Inspect `tsconfig.json` `exclude` list. The `lib/auth/{password,rate-limit}.test.ts` files may not yet exist (they're planned for Track 3 and Track 10).
- [ ] Task: Option (a): create empty test files with `describe.skip(...)` placeholders.
- [ ] Task: Option (b): add the test files to `tsconfig.json` `exclude`.
- [ ] Task: Pick (a) for now; the actual test content lands in Tracks 3 and 10.
- [ ] Task: Run `pnpm turbo run check-types`; expect 2 errors gone.

## Phase 4: Type-Cast `process.env` Reads

- [ ] Task: In `lib/test/resolve-test-database-url.ts:13`, `vitest.integration.global-setup.ts:18`, `vitest.integration.setup.ts:14`:
  - Either cast `process.env` to `NodeJS.ProcessEnv` (the explicit type).
  - Or import the validated `env` from `lib/env.ts` (Track 7 prerequisite; the cast is a placeholder).
- [ ] Task: Run `pnpm turbo run check-types`; expect 3 errors gone.

## Phase 5: Dedupe next@16 Instances

- [ ] Task: Run `pnpm dedupe --check`; identify the duplicate next@16 instances.
- [ ] Task: If duplicates exist, run `pnpm dedupe` and verify `pnpm install --frozen-lockfile` still resolves.
- [ ] Task: If `pnpm dedupe` does not resolve, add `pnpm.overrides` for `next@16.0.0` in the root `package.json`.
- [ ] Task: Run `pnpm turbo run check-types`; expect 4 errors gone.

## Phase 6: Misc Cleanup

- [ ] Task: Per the existing `auth_strategy_review` row, the 4 misc errors are:
  - `user-menu string|null` (in `components/features/auth/user-menu.tsx`)
  - `beforeEach import` (in some test file)
  - `xp.test comparison` (in `lib/gamification/xp.test.ts:124`)
  - `mastery-profile overload` (in some other test file)
- [ ] Task: Inspect each error; fix in place. Most are trivial type corrections.
- [ ] Task: Run `pnpm turbo run check-types`; expect 4 errors gone.

## Phase 7: Add `check-types` Script

- [ ] Task: Add to `apps/science-advantage/package.json` `scripts`:
  ```json
  "check-types": "tsc --noEmit"
  ```
- [ ] Task: Run `pnpm turbo run check-types --filter=science-advantage`; the app is now in scope (no longer silently skipped).

## Phase 8: Remove `ignoreBuildErrors: true`

- [ ] Task: In `apps/science-advantage/next.config.ts:25`, change `ignoreBuildErrors: true,` to `ignoreBuildErrors: false,` (or remove the line).
- [ ] Task: Update the inline comment to remove the ~370-error enumeration (now resolved).
- [ ] Task: Run `pnpm turbo run build --filter=science-advantage`; should pass with the new tsc-clean code.

## Phase 9: Delete App-Local CI Workflow

- [ ] Task: Delete `apps/science-advantage/.github/workflows/ci.yml`.
- [ ] Task: Verify the file is gone: `ls apps/science-advantage/.github/workflows/`.

## Phase 10: Add `path-filter: apps/science-advantage/**` to Monorepo Root CI

- [ ] Task: Open `.github/workflows/ci.yml` (monorepo root).
- [ ] Task: Find the existing `on: pull_request:` block; add a `paths:` filter:
  ```yaml
  on:
    pull_request:
      branches: [master]
      paths:
        - 'apps/science-advantage/**'
        - 'packages/**'
        - '.github/workflows/ci.yml'
        - 'package.json'
        - 'pnpm-lock.yaml'
        - 'pnpm-workspace.yaml'
        - 'turbo.json'
  ```
  (The exact list depends on the maintainer's preferences; the key is that `apps/science-advantage/**` is included.)
- [ ] Task: Verify the job runs the 4 gates: `pnpm turbo run {build,lint,test,check-types} --filter=science-advantage`.
- [ ] Task: Open a test PR (or push to a branch) and verify the job triggers.

## Phase 11: Fix 4 `react-hooks/immutability` Errors

- [ ] Task: Open `components/features/teacher/analytics/student-lesson-detail-analytics.tsx:151,155,186`.
- [ ] Task: Lift the `fetchAnalytics` function declaration above the `useEffect` that uses it (or wrap in `useCallback`).
- [ ] Task: Read the function carefully; ensure the fix doesn't introduce a real bug (e.g. stale closure).
- [ ] Task: Run `pnpm turbo run lint --filter=science-advantage`; expect 0 errors.

## Phase 12: Silence 6 Unused-Var Warnings

- [ ] Task: In `lib/gamification/badges.ts:114,202`, examine the `_userId` and `_triggerEvent` parameters.
- [ ] Task: If truly unused, remove them from the function signature.
- [ ] Task: If the parameter is a placeholder (e.g. for a future callback signature), add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` above the line with a comment.
- [ ] Task: Run `pnpm turbo run lint --filter=science-advantage`; expect 0 warnings.

## Phase 13: Final Acceptance

- [ ] Task: `pnpm turbo run check-types --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run lint --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run test --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [ ] Task: Open a test PR touching `apps/science-advantage/**`; verify the monorepo root CI runs all 4 gates.

## Phase 14: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `auth_strategy_review` to `Resolved`. Add a note that the resolution was via this track.
- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-1001, F-1002, F-1204, F-1205 `Resolved`. F-1003 was resolved by Track 0.
- [ ] Task: Add a lessons-learned entry: "`ignoreBuildErrors: true` is the single biggest type-safety hole; ~370 errors masked 6 root causes, each fixable in a small PR."
- [ ] Task: Move track to `measure/archive/ci_typecheck_alignment_20260603/` and update `measure/tracks.md`.
