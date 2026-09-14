# Implementation Plan: Primary Broken UX Fixes

Track ID: `primary_broken_ux_fixes_20260912`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/primary-advantage/`. Run after `primary_authorization_hardening_20260912`.

## Phase 1: Contract & Invariant Definition

These fixes change no data contracts. This phase pins the invariants as greppable checks.

- [x] Task: Define fix invariants as automated checks
  - [x] Write a static source test: `VocabularyMatching` and `Introduction` sit under `Lesson` in `messages/cn.json` and `messages/tw.json`.
  - [x] Assert no `captoliza` in live components (`my-students.tsx`, `my-classes.tsx`, `article-records-table.tsx`, `reminder-reread-table.tsx`).
  - [x] Assert no `flexl-1` in `app-layout.tsx`.
  - [x] Assert no `act` import in `student-assignment-table.tsx`.
  - [x] Assert no `from "console"` imports in `audio-generator.ts` and `userController.ts`.
  - [x] Assert no `/admin/dashboard/reports`, `/admin/settings`, or footer `/pricing` href in live files.
  - [x] Confirm the new test file fails (Red) against the current source.

## Phase 2: Test

- [x] Task: Write failing regression tests for behavioral fixes
  - [x] Test FR-1: `useTranslations("Lesson.VocabularyMatching")` resolves in the `cn` and `tw` message trees.
  - [x] Test FR-2: `admin/page.tsx` does not return an empty `<div></div>`.
  - [x] Run and confirm all new tests fail (Red).

## Phase 3: Implement

- [x] Task: FR-1 nest `VocabularyMatching` and `Introduction` inside `Lesson` in `cn.json` and `tw.json`
- [x] Task: FR-2 render `/admin` or redirect it to `/admin/dashboard`
- [x] Task: FR-3 fix `flexl-1` to `flex-1`
- [x] Task: FR-4 repoint or delete the four dead admin links and the footer `/pricing` link
- [x] Task: FR-5 correct footer year, phone number, empty `href`, address, and spelling
- [x] Task: FR-6 restore the eight commented `t()` call sites (six distinct strings) in `student-assignment-table.tsx`
- [x] Task: FR-7 point signup legal links at `/terms` and `/privacy-policy`; drop internal `target="_blank"`; rename `isPanding` to `isPending`
- [x] Task: FR-8 replace `captoliza` with `capitalize` in the eight live occurrences
- [x] Task: FR-9 remove the `act` import and the two `console` module imports
- [x] Task: Run new tests until green; run `pnpm turbo run test --filter=primary-advantage` and `check-types`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [x] Task: Update `docs/primary-advantage-ux-refactor-plan.md` Track 2 items to done
- [x] Task: Run available doctor/lint gates for primary-advantage
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
