# Implementation Plan: Reading Loading and State Correctness

Track ID: `loading_state_correctness_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

- [x] 13c1e03 Task: Define fix invariants as automated checks
  - [x] 13c1e03 Write `__test__/loading-state-fixes.test.ts` with static assertions: no `window.location.search` in `StudentCartridgeHost.tsx`, no `translation.th` in `matching.tsx`, no `window.location.href` in `student-assignment-dashboard.tsx`, no dynamic Tailwind template classes in `system-dashboard-client.tsx` and `change-role.tsx`.
  - [x] 46f06b0 Define the static lookup map shape for the health-badge classes.
  - [x] 13c1e03 Confirm the new test file fails (Red).

## Phase 2: Test

- [x] 13c1e03 Task: Write failing behavioral tests (Red)
  - [x] 13c1e03 Test FR-2: concurrent scroll triggers issue one fetch in `handle-article.tsx` (mock fetch, count calls).
  - [x] 13c1e03 Test FR-4: showcase card skips the translate POST when `translatedSummary` exists for the locale; normalizes `cn` to `zh-CN`.
  - [x] 13c1e03 Test FR-9: matching renders the empty state on an empty response and the error state on rejection.

## Phase 3: Implement

- [x] 1d81e51 Task: FR-1 remove client pagination in `teacher-assignments-table.tsx`
- [x] a2c4cb7 Task: FR-2 loading-flag guard and boolean fix in `handle-article.tsx`
- [x] dbab274 Task: FR-3 real loading condition in `system/reports.tsx`
- [x] 8bd029e Task: FR-4 cache-checked translate in `article-showcase-card.tsx` with locale normalization
- [x] 361a1a3 Task: FR-5 assignment dashboard fixes (hoist dialog, split effect, `router.push`, signin redirect)
- [x] 46f06b0 Task: FR-6 health-badge default, KPI label, static Tailwind lookup maps
- [x] 45becfb Task: FR-7 `mode` prop into `StudentCartridgeHost.tsx` from page `searchParams`
- [x] 6f8a997 Task: FR-8 `translation[currentLocale]` with Thai fallback in `matching.tsx`
- [x] 3c60af3 Task: FR-9 explicit empty and error states in `matching.tsx`
- [x] 3c60af3 Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage` and `check-types`
  - Verification ran via `CI=true npx jest` (862 passed; only the two known pre-existing failures remain) and `npx tsc --noEmit` (no new errors in touched files; remaining errors belong to another track's uncommitted APK work).
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — PASSED 2026-09-23: session S5 checks S5.12-S5.15 (owner manual verification run 2026-09-23): teacher assignments table reaches page 2 (12 seeded rows, cleaned up); showcase grid issues exactly one translate request per card per locale — zero-on-revisit unverifiable locally because Google Translate credentials point to a missing file (all calls 500 and retry); system dashboard renders fully after the unjoined-column hotfix (7d7873d52); empty matching deck shows an explicit empty state with zero skeletons. Confirmed by explicit product-owner yes on 2026-09-23.

## Phase 4: Generate Docs & Doctor

- [x] 3c60af3 Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 2 items to done
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
