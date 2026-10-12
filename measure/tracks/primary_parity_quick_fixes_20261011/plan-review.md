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

## Phase 4: Student — lessons and quizzes

Phase review of `git diff 3c96ba5ea..HEAD` (commits 84df11c01, 8e1fbced1, 00bed1179).
Plan compliance: FR-5, FR-6, and FR-7 done as planned. Critical and High findings: none.
Checks: `finishQuiz` still reads the user from the session and writes only rows of that user; the whole write set runs in
one `db.transaction`; no new `console.error`; no new message key (the FR-7 view reuses `LessonSAQ.*`); JSDoc on both new exports.
Tests: `lesson-progress.test.ts` 5 pass, `lesson-progress-bar-resume.test.tsx` 3 pass, `finish-quiz-existing-row.test.ts` 4 pass,
`finish-quiz-evidence.test.ts` 2 pass, `lesson-task-saq-completed.test.tsx` 3 pass; `components/lesson` 16 files 82 pass.
App `tsc --noEmit`: exit 0.

Medium and Low findings:

- M-4 (Medium). The red step was not run as a separate step for FR-5 and FR-6. The tests and the fix went in one commit each.
- M-5 (Medium). `finishQuiz` and `retakeQuiz` still use the old catch style and `retakeQuiz` keeps `console.error`. A logger sweep can move them.
- L-14 (Low). `finish-quiz-evidence.test.ts` needed a mock change: the transaction object now has `select`, `insert`, and `update`, because all writes moved into the transaction. The test cases did not change.
- L-15 (Low). The "one transaction" test checks that the outer `db.insert` is not called. It does not run real SQL. The ON CONFLICT `setWhere` is covered by the side-by-side acceptance check on the rehearsal copy.
- L-16 (Low). The FR-7 test mocks `@/contexts/question-context`, because the task wraps itself in its own provider.
- L-17 (Low). The completed view of task 8 still has the unused `MessageSquare` import path in the loading branch only; the form and loading views keep the old card style.
- Deviation: `startLesson` now saves `getLessonProgressForTask(2)` = 14 instead of 7. The reader accepts both values.

## Phase 5: Student — reading, saved words, profile, and XP

Phase review of `git diff c955dd335..HEAD` (commits db67372ad, 8036a121c, dbd4fbadd, 59f743de3).
Plan compliance: FR-8, FR-9, FR-10, and FR-11 done as planned. Critical and High findings: none.
Checks: the new route uses the session user only and checks `authStrength`; Zod strips `id`, `username`, and `role`;
`saveArticleCardsAfterQuiz` and `getArticleCardState` filter each query by `user_id` (tested) and refuse a non-STUDENT;
`recordGameCompletion` adds XP only on a new completion, with a SQL increment; new Primary server code logs with `logger`;
JSDoc on each new export; the 7 new `Settings.userProfile` keys exist in the five locales.
Tests: `route.test.ts` 6, `change-display-name-form.test.tsx` 3, `paragraph-utils.test.ts` + article and task-reading
paragraph cases (58 pass with `components/articles` and `components/lesson/task`), domain `games.test.ts` 46,
`primary-article-cards.test.ts` 11, `articleModel.logs-of-user.test.ts` 2 (PGlite), `article-card-saved-chip.test.tsx` 3,
article page test 8, `app/api/v1/apk` 26. Also green: `actions` + `app/api/users` + student pages (142). App and domain
`tsc --noEmit`: app exit 0; domain shows only the old `@reading-advantage/integrations-github` errors in `src/codecamp`.

Medium and Low findings:

- M-6 (Medium). The red step was not run as a separate step for any FR of this phase (test and fix in one commit).
- M-7 (Medium). `apps/reading-advantage` apk route tests and the Advantage Games completion tests did not run: Vitest in
  `apps/reading-advantage` fails on the `@/lib/apk/...` alias before any test starts (not caused by this change). The new
  option is off by default, so their calls are unchanged.
- M-8 (Medium). `GET /api/articles/[articleId]` has no session check (E-8, Out of Scope). It now returns the logs of the
  session user, or none without a session.
- L-18 (Low). The no-sentences fallback of `article-content.tsx` and `task-reading.tsx` shows the passage in 3 text blocks,
  with no pictures.
- L-19 (Low). The staff view of the read page always shows the chip "Not Saved" (it saves nothing and reads no state).
- L-20 (Low). `getArticleCardState` and `saveArticleCardsAfterQuiz` each run on every read-page load for a student. The save
  returns after one query when the quizzes are not done or the log is marked.
- L-21 (Low). `saveFlashcard` (lesson task 7, all words) and the new function dedupe differently: the new one checks
  "any card of this article in the deck", the lesson one checks each word. A lesson save after the new save adds the rest.
- L-22 (Low). The route test mocks `@reading-advantage/domain`; the real `updateUser` is covered by `users.test.ts`.
- Shortcut: the sentence spacing of article blocks was not changed (the sentence spans have no space between them when
  `sentence` has no trailing space; the legacy page is the same).
- Lesson: a PGlite test can add its own table with `CREATE TABLE IF NOT EXISTS` in `beforeAll` when the shared helper
  lacks it (`sentencs_and_words_for_flashcard`); `TRUNCATE ... CASCADE` of `articles` clears it.
- Lesson: the commit header limit leaves 38 characters for the type-scope prefix plus subject text after the
  48-character track_id suffix; the failed commit-msg check leaves no commit and no side effect.
- Deviation: `ChangeUsernameForm` keeps its file and export name. It sends to `/api/users/me` and ignores its `userId` prop.
