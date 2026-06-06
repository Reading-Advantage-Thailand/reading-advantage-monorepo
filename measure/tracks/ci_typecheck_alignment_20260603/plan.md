# Plan: CI Alignment + tsc Blocker Resolution

> TDD-light. Each FR has a verification step (`pnpm turbo run {check-types,lint,test,build} --filter=science-advantage` exits 0). The 360 tsc errors are resolved by the underlying 6 root causes; each is a small, isolated fix.

## Phase 0: Setup

- [x] Task: Confirm `pnpm turbo run check-types --filter=science-advantage` currently exits with the ~370-error list (baseline). [Red-phase test in `apps/science-advantage/lib/ci-gates/ci-gates.test.ts` asserts exit 0 — currently fails with 617 errors per `test-strategy.md` §0.] (606053d, 7cfcc47)
- [x] Task: Confirm `pnpm turbo run lint --filter=science-advantage` currently exits 1 with 4 errors + 6 warnings (baseline). [Red-phase test in same file asserts exit 0 — currently fails with 4 errors + 9 warnings.] (606053d, 7cfcc47)
- [x] Task: Coordinate with Track 3 (Argon2id + Auth Flatten) — `lib/auth/session.ts` is deleted; FR-2 must land first or coordinate the type change. [Coordination test in same file asserts `Role` from `@reading-advantage/auth` includes `INTERN` — currently passes (already widened in `packages/auth/src/roles.ts`); serves as regression guard so P2's fix in the canonical source remains intact.] (606053d, 7cfcc47)

## Phase 1: Add `@testing-library/jest-dom/vitest` Types

> **Status note (2026-06-06, Green phase):** All 4 Phase 1 gate tests pass.
> Root cause was the multi-version vitest split (3.2.4 / 4.1.5 / 4.1.6):
> `@testing-library/jest-dom/types/vitest.d.ts` resolved `import 'vitest'` to
> the hoisted vitest@4.1.5 (at `.pnpm/node_modules/vitest`), but science-advantage
> test files resolved to vitest@3.2.4. The `declare module 'vitest'` augmentation
> patched 4.1.5's `Assertion` but tests used 3.2.4's `Assertion`.
> Fix: `pnpm.overrides` for `vitest: "4.1.5"` in root `package.json` +
> upgraded science-advantage's `vitest`, `@vitest/coverage-v8`, `@vitest/ui` to
> `^4.1.5`. tsc error count dropped from 617 → 277 (jest-dom matcher cohort = 0).
> Gate tests: `phase-1-jest-dom-types.test.ts` — 4/4 passing.

- [x] Task: Add `@testing-library/jest-dom` to `apps/science-advantage/package.json` `devDependencies`. Pin to a version compatible with `@testing-library/react@^16.3.0`. _(Already satisfied; regression-locked by `phase-1-jest-dom-types.test.ts` test 2.)_ (6bada44)
- [x] Task: `pnpm install` from monorepo root; verify install. _(Done: `corepack pnpm install` with vitest override applied.)_ (6bada44)
- [x] Task: Update `apps/science-advantage/vitest.unit.setup.ts` to add `import '@testing-library/jest-dom/vitest';` at the top. _(Already satisfied; regression-locked by `phase-1-jest-dom-types.test.ts` test 1.)_ (6bada44)
- [x] Task: Run `pnpm turbo run check-types --filter=science-advantage`; expect ~354 errors gone (down from 360). _(Verified: tsc error count 617 → 277; jest-dom matcher cohort = 0 errors. Gate tests 3 & 4 pass.)_ (6bada44)

## Phase 2: Fix `lib/auth/session.ts:40,79` INTERN Role Widening

> **Status note (2026-06-06, Red phase owned by mid role):** Canonical
> `Role` source confirmed at `packages/auth/src/roles.ts` (per
> `test-strategy.md` §6 build-graph probe; 6 imports, re-exported as
> `UserRole` by consumers). The `Role` union is derived from `ROLES`
> (`(typeof ROLES)[keyof typeof ROLES]`), so `INTERN: "INTERN"` in the
> `ROLES` constant widens the union transitively. Consumer re-exports
> route through the canonical source:
> `apps/science-advantage/lib/auth/types.ts` and `constants.ts` both
> re-export `Role as UserRole` from `@reading-advantage/auth`. Red-phase
> pinning tests live at
> `packages/auth/src/__tests__/phase-2-intern-role-widening.test.ts`.
>
> **Status note (2026-06-06, Green phase):** All 28 pinning tests pass.
> Implementation was already in place since the auth package rewrite
> (`8e786a7`): `INTERN` exists in `ROLES`, `ROLE_HIERARCHY` (rank 0),
> `ROLE_ROUTES` ("/intern"), `permissions.ts` (codecamp:read/submit/chat),
> and the DB schema `roleEnum`. Consumer re-exports
> (`types.ts`, `constants.ts`, `index.ts`, `server.ts`) all route through
> the canonical source. No code changes required — Green confirmed.

- [x] Task: Find the central `UserRole` type (likely `packages/auth/src/roles.ts` or `lib/enums.ts`). (d284850, 8e786a7)
- [x] Task: Add `'INTERN'` to the type union. (d284850, 8e786a7)
- [x] Task: Update any consumer types that use `UserRole`. (d284850, 8e786a7)
- [x] Task: Run `pnpm turbo run check-types --filter=science-advantage`; expect 2 errors gone. (d284850, 8e786a7)

## Phase 3: Add `lib/auth/{password,rate-limit}.test.ts` Siblings

> **Status note (2026-06-06, Red phase owned by mid role):** The test
> strategy (`test-strategy.md` §1, row P3; §3 cross-phase note) recommends
> **option (b) tsconfig exclude** over option (a) empty stubs, because
> Track 3 (Argon2id) and Track 10 (Rate Limiter v2) are in flight and
> will replace these files any week now. An empty stub creates merge
> friction. End-state is captured in
> `apps/science-advantage/lib/ci-gates/phase-3-auth-test-siblings.test.ts`
> which currently fails on the
> `Cannot find module './rate-limit'` error in `lib/auth/rate-limit.test.ts`.
>
> **Status note (2026-06-07, Green phase):** Option (b) chosen —
> `lib/auth/rate-limit.test.ts` added to `tsconfig.json` `exclude`.
> `password.test.ts` does not exist yet (no action needed). Gate tests
> `phase-3-auth-test-siblings.test.ts` — 3/3 passing. The
> `rate-limit.test.ts` runtime failure is deferred to Track 3/10 (the
> actual `rate-limit.ts` module will land there).

- [x] Task: Inspect `tsconfig.json` `exclude` list. The `lib/auth/{password,rate-limit}.test.ts` files may not yet exist (they're planned for Track 3 and Track 10). (0b08056)
- [x] Task: Option (a): create empty test files with `describe.skip(...)` placeholders. _(Not needed; option (b) chosen per test-strategy.md.)_ (0b08056)
- [x] Task: Option (b): add the test files to `tsconfig.json` `exclude`. _(Added `lib/auth/rate-limit.test.ts` to exclude.)_ (0b08056)
- [x] Task: Pick (a) for now; the actual test content lands in Tracks 3 and 10. _(Resolved via option (b): tsconfig exclude per test-strategy.md recommendation; no stubs needed.)_ (0b08056)
- [x] Task: Run `pnpm turbo run check-types`; expect 2 errors gone. _(Verified: 0 TS2307 errors in lib/auth/* cohort; gate tests 3/3 pass.)_ (0b08056)

## Phase 4: Type-Cast `process.env` Reads

> **Status note (2026-06-07, Green phase):** Cast `process.env` to
> `{ DATABASE_URL?: string; TEST_DATABASE_URL?: string }` at all 3 sites.
> tsc error count: 276 → 273 (3 TS2559 errors eliminated).
> Gate tests `phase-4-process-env-cast.test.ts` — 6/6 passing.

- [x] Task: In `lib/test/resolve-test-database-url.ts:13`, `vitest.integration.global-setup.ts:18`, `vitest.integration.setup.ts:14`:
  - Cast `process.env` to `{ DATABASE_URL?: string; TEST_DATABASE_URL?: string }` at all 3 sites. (1ed421a)
- [x] Task: Run `pnpm turbo run check-types`; expect 3 errors gone. _(Verified: tsc error count 276 → 273; 0 TS2559 errors in Phase 4 cohort.)_ (1ed421a)

## Phase 5: Dedupe next@16 Instances

> **Status note (2026-06-06):** The vitest dedupe (the real root cause per
> `test-strategy.md` §3) was completed as part of Phase 1 via `pnpm.overrides`
> for `"vitest": "4.1.5"`. The next@16 override (`"next": "16.0.0"`) was already
> present in root `package.json`. The `@vitest/coverage-v8` and `@vitest/ui` deps
> in science-advantage were also upgraded to `^4.1.5` to match.

- [x] Task: Run `pnpm dedupe --check`; identify the duplicate next@16 instances. _(next@16 override already present; vitest dedupe done in Phase 1.)_ (6bada44)
- [x] Task: If duplicates exist, run `pnpm dedupe` and verify `pnpm install --frozen-lockfile` still resolves. _(Vitest override applied; `corepack pnpm install` succeeded.)_ (6bada44)
- [x] Task: If `pnpm dedupe` does not resolve, add `pnpm.overrides` for `next@16.0.0` in the root `package.json`. _(next@16 override was already present.)_ (6bada44)
- [x] Task: Run `pnpm turbo run check-types`; expect 4 errors gone. _(Vitest dedupe alone dropped 340 errors; TS2339 went from 347 → 2.)_ (6bada44)

## Phase 6: Misc Cleanup

> **Status note (2026-06-07, Red phase owned by mid role):** Verified the
> current tsc baseline (273 errors) and located the 4 misc-cohort files:
>
>   - `components/features/auth/user-menu.tsx:89,54` — TS2322 (`string | null`
>     assigned to `string | undefined`; `user.name` on the `AvatarImage`
>     `alt` prop).
>   - `components/features/lesson/__tests__/review-block.test.tsx:13,1` —
>     TS2304 (`Cannot find name 'beforeEach'`; the file imports
>     `afterEach, describe, expect, it, vi` from `'vitest'` at line 3 but
>     omits `beforeEach`).
>   - `lib/gamification/xp.test.ts:124,31` — TS2367 (`attemptNumber === 1`
>     comparison flagged because `attemptNumber` is narrowed to `2` at
>     line 121 via `const attemptNumber = 2;`; the test intends to
>     exercise the `=== 1` branch's *false* path so the literal-type
>     mismatch is the desired comparison — but tsc's literal-type
>     narrowing reports overlap=0).
>   - `app/api/students/[studentId]/mastery-profile/route.integration.test.ts`
>     lines 66, 85, 219, 228, 236 — 5 TS2769 errors (no overload matches
>     for the Drizzle `.insert(...).values({...})` calls in
>     `seedStandard`, `seedScenario`, and the 2026-06-07 inline `seed*`
>     helpers; likely a stale `framework: 'THAI'` literal that no longer
>     matches the enum, or a missing required field after a recent
>     `scienceStandards` / `scienceLessons` / `scienceAttempts` schema
>     widening). The plan's "1 mastery-profile overload" undercounts —
>     there are 5 sibling errors in the same file from the same
>     schema-shift root cause; fixing one likely fixes all five.
>
> End-state gate (per `test-strategy.md` §1 P6): `tsc` reports 0 errors in
> the 4 named files. Red-phase pinning tests live at
> `apps/science-advantage/lib/ci-gates/phase-6-misc-cleanup.test.ts` and
> currently fail (8 errors across the 4 files; expect ≥ 8 to disappear,
> bringing the tsc total from 273 → ≤ 265).
>
> **Status note (2026-06-07, Green phase):** All 4 files fixed:
> - `user-menu.tsx:89` — `alt={user.name || undefined}` (coerce null → undefined).
> - `review-block.test.tsx:3` — added `beforeEach` to vitest import.
> - `xp.test.ts:121` — `const attemptNumber: number = 2;` widens literal type.
> - `route.integration.test.ts` — added `schoolId: TEST_SCHOOL_ID` to all
>   seed `.values()` calls + fixed `maxScore: '100'` → `maxScore: 100` (real column).
>   Also added `schools` import and `TEST_SCHOOL_ID` constant with cleanup.
> tsc error count: 273 → 265 (8 errors eliminated). Gate tests
> `phase-6-misc-cleanup.test.ts` — 7/7 passing.

- [x] Task: Per the existing `auth_strategy_review` row, the 4 misc errors are:
  - `user-menu string|null` (in `components/features/auth/user-menu.tsx`)
  - `beforeEach import` (in some test file)
  - `xp.test comparison` (in `lib/gamification/xp.test.ts:124`)
  - `mastery-profile overload` (in some other test file) (701c04b)
- [x] Task: Inspect each error; fix in place. Most are trivial type corrections. (701c04b)
- [x] Task: Run `pnpm turbo run check-types`; expect 4 errors gone. _(Verified: tsc error count 273 → 265; 0 errors in Phase 6 cohort; gate tests 7/7 pass.)_ (701c04b)

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
