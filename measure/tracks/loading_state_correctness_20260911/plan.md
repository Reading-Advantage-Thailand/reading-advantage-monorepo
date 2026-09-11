# Implementation Plan: Reading Loading and State Correctness

Track ID: `loading_state_correctness_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

- [ ] Task: Define fix invariants as automated checks
  - [ ] Write `__test__/loading-state-fixes.test.ts` with static assertions: no `window.location.search` in `StudentCartridgeHost.tsx`, no `translation.th` in `matching.tsx`, no `window.location.href` in `student-assignment-dashboard.tsx`, no dynamic Tailwind template classes in `system-dashboard-client.tsx` and `change-role.tsx`.
  - [ ] Define the static lookup map shape for the health-badge classes.
  - [ ] Confirm the new test file fails (Red).

## Phase 2: Test

- [ ] Task: Write failing behavioral tests (Red)
  - [ ] Test FR-2: concurrent scroll triggers issue one fetch in `handle-article.tsx` (mock fetch, count calls).
  - [ ] Test FR-4: showcase card skips the translate POST when `translatedSummary` exists for the locale; normalizes `cn` to `zh-CN`.
  - [ ] Test FR-9: matching renders the empty state on an empty response and the error state on rejection.

## Phase 3: Implement

- [ ] Task: FR-1 remove client pagination in `teacher-assignments-table.tsx`
- [ ] Task: FR-2 loading-flag guard and boolean fix in `handle-article.tsx`
- [ ] Task: FR-3 real loading condition in `system/reports.tsx`
- [ ] Task: FR-4 cache-checked translate in `article-showcase-card.tsx` with locale normalization
- [ ] Task: FR-5 assignment dashboard fixes (hoist dialog, split effect, `router.push`, signin redirect)
- [ ] Task: FR-6 health-badge default, KPI label, static Tailwind lookup maps
- [ ] Task: FR-7 `mode` prop into `StudentCartridgeHost.tsx` from page `searchParams`
- [ ] Task: FR-8 `translation[currentLocale]` with Thai fallback in `matching.tsx`
- [ ] Task: FR-9 explicit empty and error states in `matching.tsx`
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 2 items to done
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
