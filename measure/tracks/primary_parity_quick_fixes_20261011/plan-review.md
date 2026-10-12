# Plan review — primary_parity_quick_fixes_20261011

## Phase 1: Design

Phase review of `git diff 0048f9620..HEAD`: two files in the track folder (plan.md, captures.md). No code changed.
Plan compliance: all Phase 1 tasks done. Critical and High findings: none.

Medium and Low findings:

- M-1 (Medium). The look check is pending (owner, async). The build phases follow the design in plan.md. A change
  after the owner look check can change FR-8, FR-11, and FR-13 markup.
- L-1 (Low). The `StatusChip` dark tones do not read well on parchment at night. FR-11 uses an ink-on-parchment chip
  with fixed colors. The build phase must not use `StatusChip tone="info"` for the saved chip on the article page.
- L-2 (Low). The captures use harness compositions of the real chrome, with fixture text. They do not use the real
  page data flow. The side-by-side check of the acceptance kit stays the proof for behavior.
- L-3 (Low). The scroll icon (`ART.scroll`) is small in the old-link note (FR-13). The build phase can use a bigger
  size or the `Bubble` component.
- L-4 (Low). New message keys named in the design: `Settings.userProfile.displayName`, `displayNameDescription`,
  `signInUsername`, `signInUsernameDescription`, `codeOnlyError`, and `StudentSignIn.code.oldLink`. Each needs five locales (R-3).
- Shortcut: the grade select lists grades 3 to 12 as the create dialog does, while the contract accepts 1 to 12.
- Lesson: `pnpm` is not needed for a capture harness. `node_modules/.bin/esbuild`, `@tailwindcss/postcss`, and
  `playwright-core` with `/usr/bin/google-chrome` are enough. The Playwright browser cache of this machine is empty.

## Phase 2: Admin

Phase review of `git diff 99964d8fd..HEAD` (commits 8ce321d69 and e5c036c9f).
Plan compliance: FR-1 and FR-2 done as planned. Critical and High findings: none.
Checks: Zod at the PATCH boundary (`updateClassroomBodySchema`); the controller keeps `canManageClassrooms`
and `updateClassroom` keeps its school scope (`getAccessibleClassroom`); JSDoc on each new export; no new
`console.error` in server code (the controller keeps its old catch block); keys in five locales.
Tests: `classroomController.authorization.test.ts` 8 pass, `classrooms-table-edit.test.tsx` 2 pass,
`students-crud-live-calls.test.tsx` 11 pass. App `tsc --noEmit`: exit 0.

Medium and Low findings:

- M-2 (Medium). `updateClassroomController` and `updateClassroom` still use `console.error` in their catch blocks
  (old code). The phase did not change them. A later logger sweep can move them to `logger.error`.
- L-5 (Low). The keys `Admin.Classrooms.studentPassword` and `studentPasswordPlaceholder` (and `gradePlaceholder`)
  are now unused in the five locale files. The phase left them in place to keep the diff small.
- L-6 (Low). The create dialog still sends `passwordStudents: ""` and keeps the `passwordStudents` form state
  (Q1 only covers the edit dialog). The create route ignores it. Remove it in a cleanup.
- L-7 (Low). The old PATCH controller accepted `description`; it was never saved. The new schema drops it.
- L-8 (Low). The edit-class test mocks the Radix `Select` and `DropdownMenu` as native elements, because Radix
  needs pointer events that jsdom lacks. The real select is not covered by a jsdom test.
- L-9 (Low). The admin students error toast reads `error` from the JSON answer. If a route returns text, the toast
  shows the title only. The routes `app/api/students` were not changed.
- Shortcut: the pnpm binaries were not used. Tests ran with `../../node_modules/.bin/vitest` from the app folder,
  because `apps/primary-advantage/node_modules` has no `.bin`.
- Lesson: `husky` commit-msg runs fast on this lane (no `pnpm install` start). The `HUSKY=0` fallback was not needed.

## Phase 3: Teacher

Phase review of `git diff 5f13552ab..HEAD` (commits 20e816b72 and 949863f0d).
Plan compliance: FR-3 and FR-4 done as planned. Critical and High findings: none.
Checks: the new reads take ids from the list that the school-scoped query built, so the grouped queries read no
other student. No new route, so no new Zod boundary. JSDoc on both new helpers. No new `console.error` (the three
old catch blocks stay). No message key changed (the keys exist in the five locales).
Tests: `classroomModel.last-activity.test.ts` 4 pass (PGlite), `teacher-progress-reports.test.tsx` 4 pass,
`my-classes.test.tsx` 10 pass, `classroomModel.authorization.test.ts` pass. App `tsc --noEmit`: exit 0.

Medium and Low findings:

- M-3 (Medium). The three list reads still use `console.error` in the old catch blocks. A logger sweep can move them.
- L-10 (Low). The "active" window is 7 x 24 hours from the render time of the client component. The page keeps
  its server data, so a tab that stays open for a long time shows a stale count until reload.
- L-11 (Low). `getAllStudentsInSystem` and the two other reads run two extra grouped queries for each call. They use
  `max()` with `group by`, so the cost grows with the rows of the listed students.
- L-12 (Low). The first test of `my-classes.test.tsx` timed out once on a cold import (5 s). It passed on the next run.
- L-13 (Low). The edit dialog of `my-classes.tsx` still lists grades 3 to 12 only. A class with another grade shows
  an empty select (same as before this phase).
- Lesson: the PGlite helper (`server/models/__tests__/helpers/testDb.ts`) gives a real-SQL test for model reads at low cost.
