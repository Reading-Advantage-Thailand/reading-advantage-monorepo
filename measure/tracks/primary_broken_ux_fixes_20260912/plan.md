# Implementation Plan: Primary Broken UX Fixes

Track ID: `primary_broken_ux_fixes_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. Run after `primary_authorization_hardening_20260912`.

## Phase 1: Contract & Invariant Definition

These fixes change no data contracts. This phase pins the invariants as greppable checks.

- [ ] Task: Define fix invariants as automated checks
  - [ ] Write a static source test: `VocabularyMatching` and `Introduction` sit under `Lesson` in `messages/cn.json` and `messages/tw.json`.
  - [ ] Assert no `captoliza` in live components (`my-students.tsx`, `my-classes.tsx`, `article-records-table.tsx`, `reminder-reread-table.tsx`).
  - [ ] Assert no `flexl-1` in `app-layout.tsx`.
  - [ ] Assert no `act` import in `student-assignment-table.tsx`.
  - [ ] Assert no `from "console"` imports in `audio-generator.ts` and `userController.ts`.
  - [ ] Assert no `/admin/dashboard/reports`, `/admin/settings`, or footer `/pricing` href in live files.
  - [ ] Confirm the new test file fails (Red) against the current source.

## Phase 2: Test

- [ ] Task: Write failing regression tests for behavioral fixes
  - [ ] Test FR-1: `useTranslations("Lesson.VocabularyMatching")` resolves in the `cn` and `tw` message trees.
  - [ ] Test FR-2: `admin/page.tsx` does not return an empty `<div></div>`.
  - [ ] Run and confirm all new tests fail (Red).

## Phase 3: Implement

- [ ] Task: FR-1 nest `VocabularyMatching` and `Introduction` inside `Lesson` in `cn.json` and `tw.json`
- [ ] Task: FR-2 render `/admin` or redirect it to `/admin/dashboard`
- [ ] Task: FR-3 fix `flexl-1` to `flex-1`
- [ ] Task: FR-4 repoint or delete the four dead admin links and the footer `/pricing` link
- [ ] Task: FR-5 correct footer year, phone number, empty `href`, address, and spelling
- [ ] Task: FR-6 restore the six commented `t()` calls in `student-assignment-table.tsx`
- [ ] Task: FR-7 point signup legal links at `/terms` and `/privacy-policy`; drop internal `target="_blank"`
- [ ] Task: FR-8 replace `captoliza` with `capitalize` in the eight live occurrences
- [ ] Task: FR-9 remove the `act` import and the two `console` module imports
- [ ] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update `docs/primary-advantage-ux-refactor-plan.md` Track 2 items to done
- [ ] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
