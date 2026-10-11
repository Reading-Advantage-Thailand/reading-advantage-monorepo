# Plan — Primary parity quick fixes

Work on `primary-parity-integration` (or a lane branch from it), except FR-12: FR-12 goes on
`primary/public-pages` (spec FR-12). App root: `apps/primary-advantage` (paths below are relative to
it unless they start with `packages/`). Tests: `pnpm --filter primary-advantage test` and
`pnpm --filter @reading-advantage/domain test`; run one test file with `npx vitest run <file>` in the
package. Commit subjects: `fix(primary): <subject> (track_id: primary_parity_quick_fixes_20261011)`,
100 characters or less. Machine rules: one heavy job at a time (tsc, build, browser run); no run with
25 students.

The phases follow the areas of the spec (admin, teacher, student, public), as the set asks. Each FR
task keeps the Contract-First order inside it: the contract (when the FR has one), then the failing
test (red), then the fix (green). The last phase holds the docs and doctor steps.

## Phase 1: Design

- [ ] Task: Ask the owner the member questions
    - [ ] Ask Q1 (FR-1, the "Student password" field) and Q2 (FR-13, old class code links) of spec "Member questions"
    - [ ] Record the answers and the date under this task
- [ ] Task: Design the changed student pieces in the RPG skin
    - [ ] Reuse `components/rpg/chrome.tsx` (`Panel`, `RpgButton`, `Sign`) and the `cq-` tokens (`styles/rpg.css`); draw no new frame (`docs/primary-rpg-skin.md` rule 2)
    - [ ] Settings at the inn (FR-8): "Display name" field with its help text, the read-only "Sign-in username" below it, the error message for a code-only session
    - [ ] Article page (FR-9, FR-11): the text in 3 blocks with a picture each; the chip in its two states ("Saved", "Not saved")
    - [ ] Lesson task 8 (FR-7): the saved answer view
    - [ ] Sign-in (FR-13): the code step with a prefilled code, and the note for an old link
    - [ ] Make a static mock or a prototype capture of each piece at 375 px and 1280 px, day and night; save to `measure/tracks/primary_parity_quick_fixes_20261011/captures/design/` (demo or QA data only)
- [ ] Task: Design the changed staff pieces in the staff shell
    - [ ] Admin class dialog (FR-1): name, the grade select of the create dialog, and the result of Q1 for the password field
    - [ ] Reports tiles (FR-3): the fourth tile with the percent and "n of m students"; the four tiles on one row at 1280 px and two rows at 375 px
    - [ ] Admin students toasts (FR-2): the success and error toasts with the title and the description
    - [ ] Captures at 375 px and 1280 px in the same folder
- [ ] Task: Owner look check of the design
    - [ ] Send the captures to the owner; record the answer and the date here; change the design until the owner accepts it
- [ ] Task: Measure - User Manual Verification 'Phase 1: Design' (Protocol in workflow.md)

## Phase 2: Admin

- [ ] Task: FR-1 (ADM-02) — the admin can edit a class again
    - [ ] Contract: `updateClassroomBodySchema` in `lib/zod.ts` (`classroomName` trimmed 1 to 100; `grade` optional, "1" to "12"; `passwordStudents` only if Q1 keeps the field), with JSDoc
    - [ ] Red: in `server/controllers/__tests__/classroomController.authorization.test.ts`, add: the PATCH body of the admin dialog gives 200 and calls `updateClassroom` with the name and the grade; an empty name gives 400 with the field error; a grade "13" gives 400
    - [ ] Red: new `components/admin/__tests__/classrooms-table-edit.test.tsx` (jsdom): the edit dialog sends `classroomName` and `grade`; the grade control is a select
    - [ ] Green: `server/controllers/classroomController.ts:141-187` parses with the schema; `components/admin/classrooms-table.tsx:178-213` and `:490-545` send and show the new fields; the result of Q1 in the dialog and, if kept, in `server/models/classroomModel.ts:528-597`
    - [ ] Check that `components/teacher/my-classes.tsx` still saves (the existing teacher test, or one new case in `components/teacher/__tests__/my-classes.test.tsx`)
- [ ] Task: FR-2 (ADM-06) — the students page shows the result of each change
    - [ ] Red: in `app/[locale]/admin/__tests__/students-crud-live-calls.test.tsx`, mock `sonner` and assert a success toast for add, edit, and delete, and an error toast with the server `error` text for a failed call of each
    - [ ] Red: a key parity check for `AdminStudents.toasts.*` in the five locales (extend the existing i18n parity test, `components/__tests__/structural-alignment-i18n.test.tsx`, or add one case)
    - [ ] Green: add the toasts in `app/[locale]/admin/students/page.tsx:250-360`; add the seven keys to `messages/{en,th,cn,tw,vi}.json` from the legacy files
- [ ] Task: Measure - User Manual Verification 'Phase 2: Admin' (Protocol in workflow.md)

## Phase 3: Teacher

- [ ] Task: FR-3 (TCH-05) — the "Active this week" tile
    - [ ] Red: new `server/models/__tests__/classroomModel.last-activity.test.ts`: the three student-list reads return `lastActivity` as the newest `created_at` of `user_activity` and `xp_logs`, `null` for a student with no row, and one grouped query for the list
    - [ ] Red: in `components/teacher/__tests__/teacher-progress-reports.test.tsx`, add: four tiles; with 2 of 4 students active in 7 days the tile shows 50 % and "2 of 4 students"; the class filter changes the count
    - [ ] Green: `server/models/classroomModel.ts:678-900` (three reads and one shared helper); `components/teacher/teacher-progress-reports.tsx:147-160` and `:291-295`
- [ ] Task: FR-4 (TCH-08) — the class page "Settings" link opens the edit dialog
    - [ ] Red: in `components/teacher/__tests__/my-classes.test.tsx`, add: with `?edit=<id of a listed class>` the edit dialog opens with its name and grade; with an unknown id no dialog opens; a close removes `edit` from the URL
    - [ ] Green: `components/teacher/my-classes.tsx:92-120` reads `useSearchParams` after the list loads and opens the dialog; `router.replace` on close
- [ ] Task: Measure - User Manual Verification 'Phase 3: Teacher' (Protocol in workflow.md)

## Phase 4: Student — lessons and quizzes

- [ ] Task: FR-5 (STU-02) — a lesson resumes on the saved task
    - [ ] Red: new `lib/__tests__/lesson-progress.test.ts`: `getLessonTaskFromProgress` gives 1 for 0, -5, and NaN; 2 for 7 and 14; 13 for 93; 14 for 100 and 150; `getLessonProgressForTask` gives 0 for 1, 14 for 2, 93 for 13, 100 for 14; a round trip of each task gives the same task
    - [ ] Red: new `components/lesson/__tests__/lesson-progress-bar-resume.test.tsx`: a progress response of 93 opens task 13 with its Next button; 0 on an assignment opens task 1; 100 opens the summary and pauses the timer
    - [ ] Green: new `lib/lesson-progress.ts` (pure, with JSDoc); `components/lesson/lesson-progress-bar.tsx:157-171`, `:229`, `:317`
- [ ] Task: FR-6 (STU-03) — a quiz finishes when a row exists
    - [ ] Red: new `actions/__tests__/finish-quiz-existing-row.test.ts`: a `completed = false` row becomes complete and gets one XP log; a second call for a complete row returns success and writes no XP log and no XP; a new article inserts a row; all writes run in one transaction
    - [ ] Green: `actions/question.ts:60-182` (upsert on the unique key with `onConflictDoUpdate` where `completed = false`, one `db.transaction`, the evidence job only when the row changed); keep `actions/__tests__/finish-quiz-evidence.test.ts` green
- [ ] Task: FR-7 (STU-17) — lesson task 8 shows the saved short answer
    - [ ] Red: new `components/lesson/practice/__tests__/lesson-task-saq-completed.test.tsx`: a `COMPLETED` response shows the saved question, answer, suggested answer, feedback, and score, and pauses the timer; a failed read shows the empty form; an `INCOMPLETE` response shows the form
    - [ ] Green: `components/lesson/practice/lesson-task-saq.tsx:38-46` reads `/api/articles/questions/<id>?articleId=<id>&questionType=SA_QUESTION` (`cache: "no-store"`) before the form
- [ ] Task: Measure - User Manual Verification 'Phase 4: Student — lessons and quizzes' (Protocol in workflow.md)

## Phase 5: Student — reading, saved words, profile, and XP

- [ ] Task: FR-8 (STU-06) — the student changes the display name
    - [ ] Contract: `updateOwnDisplayNameBodySchema` in `lib/zod.ts` (`name` trimmed, 2 to 40 characters), with JSDoc
    - [ ] Red: new `app/api/users/me/__tests__/route.test.ts`: a full student session changes its own `name` through `updateUser`; a `code_only` session gets 403; no session gets 401; a body with `id`, `username`, or `role` changes nothing else (the schema strips it); a name of 1 or 41 characters gives 400
    - [ ] Red: new `components/__tests__/change-display-name-form.test.tsx`: the form sends PATCH `/api/users/me`; a failure shows the error toast; the labels are "Display name" and "Sign-in username"
    - [ ] Green: new `app/api/users/me/route.ts` (PATCH; `getTenantDB`; `logger.error` on a failure); `components/change-username-form.tsx`; `app/[locale]/(student)/settings/user-profile/page.tsx:51-58`; new keys `Settings.userProfile.displayName`, `displayNameDescription`, `signInUsername` in the five locales
- [ ] Task: FR-9 (STU-07) — the article text shows every sentence
    - [ ] Red: new `lib/__tests__/paragraph-utils.test.ts`, ported from legacy `lib/paragraph-utils.test.ts` (bucket sizes 7 → 3, 2, 2; 8 → 3, 3, 2; 10 → 4, 3, 3; 0, 1, and 2 items; order and identity kept; the passage split)
    - [ ] Red: new `components/articles/__tests__/article-content-paragraphs.test.tsx` and one case in `components/lesson/task/__tests__/task-reading-highlight.behavior.test.tsx`: a sentence that no passage paragraph contains shows; a short sentence that two paragraphs contain shows one time; the blocks are 3
    - [ ] Green: new `lib/paragraph-utils.ts`; `components/articles/article-content.tsx:414-416` and `:945-986`; `components/lesson/task/task-reading.tsx:53` and `:393-420`
    - [ ] Tell the read-along session (`primary_parity_read_along_20261011`) the commit, because it changes the same file
- [ ] Task: FR-10 (STU-08) — game XP goes into the student's XP
    - [ ] Red: in `packages/domain/src/__tests__/games.test.ts`, add: with `addToUserXp: true` a new completion adds `xpEarned` to `users.xp` in the same transaction; a duplicate adds nothing; without the option `users` gets no update; the client schema still refuses an `xp` field
    - [ ] Red: in the Primary complete route test (`app/api/v1/apk/__tests__/`), assert that the route passes `addToUserXp: true`
    - [ ] Green: `packages/domain/src/games/mutations.ts:66-200` (the `options` parameter, the SQL increment of `users.xp` after the saved completion); `app/api/v1/apk/complete/route.ts:60-65`
    - [ ] Check that `apps/reading-advantage/app/api/v1/apk/routes.test.ts` and the Advantage Games completion tests stay green
- [ ] Task: FR-11 (STU-16) — the chip shows the student's own state; the legacy save rule
    - [ ] Contract: in new `packages/domain/src/games/primary-article-cards.ts`, Zod schemas `saveArticleCardsInputSchema` (`articleId` uuid), `saveArticleCardsOutputSchema` (`wordsCreated`, `sentencesCreated`, `alreadySaved`), and `articleCardStateOutputSchema` (`saved`); export them from `packages/domain/src/games/index.ts`
    - [ ] Red: new `packages/domain/src/__tests__/primary-article-cards.test.ts` (mock DB): no save before all three quizzes; 3 to 5 words with a fixed random function; words already in the vocabulary deck (any case, any article) are left out; all sentences; nothing when both kinds exist; the log is marked saved; a TEACHER gets an auth error; each query filters `user_id`
    - [ ] Red: new `components/articles/__tests__/article-card-saved-chip.test.tsx`: the chip shows "Not saved" when another user saved the article and this user did not; "Saved" for this user's log or cards
    - [ ] Red: a test for `getArticleById(articleId, userId)` in `server/models/__tests__/articleModel.questions.test.ts` or a new file: only the logs of `userId`; no log without a user
    - [ ] Green: `packages/domain/src/games/primary-article-cards.ts`; `server/models/articleModel.ts:436-460`; `server/controllers/articleController.ts:112-120` (no user, no log); `app/[locale]/(student)/student/read/[articleId]/page.tsx:114-135`; `components/articles/article-card.tsx:18-60`
    - [ ] Check that `actions/__tests__/flashcard-dashboard-data.test.ts` and the lesson task 7 path still pass
- [ ] Task: Measure - User Manual Verification 'Phase 5: Student — reading, saved words, profile, and XP' (Protocol in workflow.md)

## Phase 6: Public

- [ ] Task: FR-12 (PUB-04) — the footer Support link and email (on `primary/public-pages`)
    - [ ] Tell the owner of `primary_public_pages_20261007` (the PR session) before the commit; work in `/home/daniebo/Desktop/rama-worktrees/public-pages`
    - [ ] Red: new `components/index/__tests__/footer.test.tsx` on the branch: "Support" links to `/contact`; the email link is `CONTACT_CHANNELS.email.href` (`mailto:support@reading-advantage.com`); no Google Form URL
    - [ ] Green: `components/index/footer.tsx` on the branch (the "Support" href only)
    - [ ] Record the branch commit here. Integration gets no change of `components/index/footer.tsx`
- [ ] Task: FR-13 (PUB-05) — `?classroom_code=` fills the class code step
    - [ ] Red: in `components/__tests__/student-code-sign-in.test.tsx`, add: `?classroom_code=ab c12d` sends `ABC12D` one time and opens the name step; a wrong 6-character code shows "codeInvalid"; an 8-character code is not sent and shows the note; no query keeps today's flow
    - [ ] Green: `components/student-login/code-sign-in.tsx:80-145` (`useSearchParams`, a ref guard, the normalize rule of `submitCode`); new key `StudentSignIn.code.oldLink` in the five locales (or the result of Q2)
- [ ] Task: Measure - User Manual Verification 'Phase 6: Public' (Protocol in workflow.md)

## Phase 7: Acceptance, Docs & Doctor

- [ ] Task: Run the gates, one at a time
    - [ ] `pnpm --filter primary-advantage test`, `pnpm --filter @reading-advantage/domain test`
    - [ ] `pnpm --filter primary-advantage check-types`, then `pnpm --filter @reading-advantage/domain check-types`
    - [ ] `pnpm --filter primary-advantage lint` and the domain lint on the changed files
- [ ] Task: Side-by-side acceptance on the rehearsal copy
    - [ ] Write `measure/tracks/primary_parity_quick_fixes_20261011/acceptance-pairs.json` with the rows AC-1 to AC-13 of the spec (the pair list contract of `primary_parity_acceptance_20261011`)
    - [ ] Fill the behavior contract template (`docs/runbooks/primary-behavior-contract-template.md`) for FR-3, FR-5, FR-6, and FR-11
    - [ ] Run the kit on the matched copies with a production build of each app (one app at a time); run the data checks of the spec table "Migrated data"
    - [ ] Write `measure/tracks/primary_parity_quick_fixes_20261011/acceptance.md` (the kit template); keep the captures in the private folder
- [ ] Task: Owner look check of the built pages
    - [ ] Send the report and the new captures (375 px and 1280 px, day and night for the student pages); record the answer here
- [ ] Task: Record the found items
    - [ ] Show the owner E-8 (`/api/articles/[articleId]` GET with no session check) and the level rule of `calculateLevelAndCefrLevel`; on a yes, add the rows to `measure/tech-debt.md` (the file has more than 50 lines, so ask the owner to prune it first, `measure/workflow.md` step 8)
    - [ ] Tell `primary_parity_school_management_20261011`, `primary_parity_read_along_20261011`, and `primary_parity_lesson_repeat_20261011` that their dependency is complete
- [ ] Task: Generate Docs & Doctor
    - [ ] Run `measure/generate.sh`; stage the files that it changes
    - [ ] Run `measure/doctor.sh`; fix each failure that names a file of this track
    - [ ] If `graph.db` is fresh, run `build-graph update ./graph.db <changed files>`
- [ ] Task: Measure - User Manual Verification 'Phase 7: Acceptance, Docs & Doctor' (Protocol in workflow.md)
