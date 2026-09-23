# Implementation Plan: Reading Broken UX Fixes

Track ID: `broken_ux_fixes_20260911`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/`.

## Phase 1: Contract & Invariant Definition

These fixes change no data contracts. This phase pins the invariants as greppable checks.

- [x] Task: Define fix invariants as automated checks `8174d49`
  - [x] Write `__test__/broken-ux-fixes.test.ts` with static source assertions: no `captoliza` in `components/`, no `/teacher/class-detail/` in source, no hardcoded `/th/teacher` redirects, no `import { log } from "console"`, no `act` import in `student-assignment-dashboard.tsx`, `"use client"` present in `matching.tsx` and `tab-matching-words.tsx`.
  - [x] Confirm the new test file fails (Red) against the current source. (Red: 12 failed, 1 passed; Green: 13/13)
  - [x] Owner decision record for FR-10 games auth policy: **2026-09-11 owner decision — games require sign-in; add the same `/auth/signin` redirect as sibling pages.**

## Phase 2: Test

- [x] Task: Write failing regression tests for behavioral fixes
  - [x] Test FR-1: `handleGenreClick` navigates to `/student/read` (assert the pushed URL in `student-dashboard-content.tsx`).
  - [x] Test FR-7: `flashcard-game.tsx` calls `speechSynthesis.cancel()` before `speak()` and on unmount (mock `speechSynthesis`).
  - [x] Test FR-9: opening `chatbot-floating-button.tsx` does not clear existing messages.
  - [x] Run and confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 genre link fix in `student-dashboard-content.tsx` `61ce729`
- [x] Task: FR-2 remove `captoliza` from both history tables `eb57371` (deviation: 10 components had 20 occurrences; all removed per AC-2)
- [x] Task: FR-3 teacher 404 links in `class-summary-table.tsx` and `class-detail-dashboard.tsx` `0b4945d` (deviation: real path is `components/dashboard/class-summary-table.tsx`)
- [x] Task: FR-4 locale-relative redirects and relative `router.push` in teacher pages `5ef0aff` (deviation: 11 `NEXT_PUBLIC_BASE_URL` prefixes removed across `components/teacher/`)
- [x] Task: FR-5 restore `"use client"` in `matching.tsx` and `tab-matching-words.tsx` `b171457`
- [x] Task: FR-6 remove `act` import in `student-assignment-dashboard.tsx` `101a0be`
- [x] Task: FR-7 `speechSynthesis.cancel()` in `flashcard-game.tsx` `b65503f`
- [x] Task: FR-8 fix `max-w-[400px]]` and delete `console` imports `7708d3c`
- [x] Task: FR-9 chatbot history preservation and `" : "` prefix removal `2a6c13e`
- [x] Task: FR-10 enforce the owner-approved games auth policy `08bd3ac1` `71d4236d` (gate on page; test updated to expect the redirect per owner decision 2026-09-11)
- [x] Task: Run new tests until green; run test suite and `check-types` (13/13 new tests; 122/124 suites pass, 2 pre-existing APK failures; 17 pre-existing tsc errors in unrelated files)
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) — PASSED 2026-09-23: session S5 checks S5.1-S5.6 (owner manual verification run 2026-09-23): genre chip handler routes to /student/read with a rendered list; teacher Reports link keeps the locale; matching game renders playable cards; flashcard speech cancels before each speak; chatbot history survives close/open with no " : " prefix; anonymous games access redirects to sign-in. Three defects found during verification were hotfixed and re-verified live: read-page uuid/text join (33d7519ae), matching word payload shape (3276755a8), chatbot question-store guard (ce5296150). Confirmed by explicit product-owner yes on 2026-09-23.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/reading-advantage-ux-refactor-plan.md` Phase 0 items to done
- [ ] Task: Run available doctor/lint gates for reading-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
