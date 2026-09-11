# Implementation Plan: Reading Broken UX Fixes

Track ID: `broken_ux_fixes_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

These fixes change no data contracts. This phase pins the invariants as greppable checks.

- [ ] Task: Define fix invariants as automated checks
  - [ ] Write `__test__/broken-ux-fixes.test.ts` with static source assertions: no `captoliza` in `components/`, no `/teacher/class-detail/` in source, no hardcoded `/th/teacher` redirects, no `import { log } from "console"`, no `act` import in `student-assignment-dashboard.tsx`, `"use client"` present in `matching.tsx` and `tab-matching-words.tsx`.
  - [ ] Confirm the new test file fails (Red) against the current source.
  - [ ] Owner decision record for FR-10 games auth policy: note the chosen policy in this plan before implementation.

## Phase 2: Test

- [ ] Task: Write failing regression tests for behavioral fixes
  - [ ] Test FR-1: `handleGenreClick` navigates to `/student/read` (assert the pushed URL in `student-dashboard-content.tsx`).
  - [ ] Test FR-7: `flashcard-game.tsx` calls `speechSynthesis.cancel()` before `speak()` and on unmount (mock `speechSynthesis`).
  - [ ] Test FR-9: opening `chatbot-floating-button.tsx` does not clear existing messages.
  - [ ] Run and confirm all new tests fail (Red).

## Phase 3: Implement

- [ ] Task: FR-1 genre link fix in `student-dashboard-content.tsx`
- [ ] Task: FR-2 remove `captoliza` from both history tables
- [ ] Task: FR-3 teacher 404 links in `class-summary-table.tsx` and `class-detail-dashboard.tsx`
- [ ] Task: FR-4 locale-relative redirects and relative `router.push` in teacher pages
- [ ] Task: FR-5 restore `"use client"` in `matching.tsx` and `tab-matching-words.tsx`
- [ ] Task: FR-6 remove `act` import in `student-assignment-dashboard.tsx`
- [ ] Task: FR-7 `speechSynthesis.cancel()` in `flashcard-game.tsx`
- [ ] Task: FR-8 fix `max-w-[400px]]` and delete `console` imports
- [ ] Task: FR-9 chatbot history preservation and `" : "` prefix removal
- [ ] Task: FR-10 enforce the owner-approved games auth policy
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=reading-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 0 items to done
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
