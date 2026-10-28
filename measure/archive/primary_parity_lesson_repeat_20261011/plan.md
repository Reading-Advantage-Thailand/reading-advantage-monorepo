# Plan: Teach a lesson again and start a lesson again

Track: `primary_parity_lesson_repeat_20261011`. Branch: a lane branch from `primary-parity-integration`
after `primary_parity_quick_fixes_20261011` (STU-02, STU-03, STU-17 change the lesson flow and
`finishQuiz`). Tell the monorepo session before any write to `primary-parity-integration`. Run one
heavy job at a time. Every task follows the TDD order of `measure/workflow.md`.

## Phase D: Design (RPG skin) [checkpoint: 11392de37]

- [x] Task: Design the student "Start again"
    - [x] Draw the lesson summary (task 14) with "Back to Read Page" and "Start again" (iron button), the confirm dialog, and the "Attempt N" text; reuse `components/rpg/chrome.tsx`
- [x] Task: Design the teacher "Teach again" and the attempt views
    - [x] Draw the lesson row of the lesson plan with "Teach again", the confirm dialog text, and "Taught 2 times"
    - [x] Draw the drill-down list of earlier attempts and the grid cell marker
- [x] Task: Captures and the owner's look check
    - [x] Capture at 375 px and 1280 px, day and night, into `measure/tracks/primary_parity_lesson_repeat_20261011/design/`
    - [x] Record the owner's answer and the answers to the Member Questions in `design/look-check.md` (look check pending (owner, async); defaults used: Q1 legacy XP rule on each attempt, Q2 "Teach again" closes all students with work, Q3 the student can use "Start again" in a teacher-led class)
- [x] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md)
    - Manual steps: open the 36 PNG files of `design/captures.md`; check 375 px and 1280 px, day and night; check the gold and iron buttons; answer the 4 questions of `design/look-check.md`. Look check pending (owner, async).

## Phase S1: Keep each closed attempt in a history [checkpoint: 0d97e0fdc]
_Story ref: spec.md#story-s1_

- [x] Task: Define the schema and the contracts
    - [x] New `packages/db/src/schema/primary-lesson-attempts.ts` (`primary_lesson_attempts`, spec "Design"); export it in `packages/db/src/schema/index.ts`
    - [x] Add `run_number` and `earlier_runs` to `primaryClassBookLessons` in `packages/db/src/schema/primary-books.ts`
    - [x] Classify `primaryLessonAttempts` as FLAT in `packages/domain/src/tenant-registry.ts`
    - [x] New `packages/domain/src/primary-lesson-attempts/contracts.ts`: `closeLessonAttemptInput`, `lessonAttemptSchema`, `LESSON_ACTIVITY_TYPES` (the 10 legacy types), `closeReasonSchema`
- [x] Task: Generate the migration
    - [x] Check the next free number in `packages/db/drizzle/` at the start of the phase; run `pnpm --filter @reading-advantage/db generate`; review the SQL (additive only)
    - [x] Add the sentinel in `packages/db/src/sentinels.ts`; set the new tag in `apps/primary-advantage/cloudbuild.yaml` and `apps/primary-advantage/cloudbuild-etl.yaml` (`--required-migration`)
    - [x] Run `journal-integrity.test.ts`, `primary-deploy-gate-contract.test.ts`, and `tenant-coverage.test.ts`
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/primary-lesson-attempts/__tests__/attempts.test.ts` with `packages/domain/src/__tests__/mock-db.ts`: the history row and its attempt number; the deletes and the flag reset; XP logs and `users.xp` unchanged; read flag, rating, flashcards unchanged; a transaction failure writes nothing; another school gives FORBIDDEN
- [x] Task: Implement `closeLessonAttempt` (green)
    - [x] `packages/domain/src/primary-lesson-attempts/attempts.ts`: one transaction through `createTenantDB(...).unscoped("<reason>")` for the REFERENTIAL tables; a transaction-level variant for "Teach again"
    - [x] `packages/domain/src/primary-lesson-attempts/index.ts` and the export path in `packages/domain/package.json`
- [x] Task: Prove the migration and one close on real rows
    - [x] Clone the rehearsal copy (`create database <clone> template <rehearsal copy>`; never the shared `primary_advantage`); migrate; close one attempt of one demo student; record the rows in `measure/tracks/primary_parity_lesson_repeat_20261011/real-run.md`
    - [x] Tell `primary_parity_rehearsal3_20261011` the new migration tag and the two config changes
- [x] Task: Docs and doctor
    - [x] JSDoc on every export; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S1: Keep each closed attempt in a history' (Protocol in workflow.md)

Notes (Phase S1, helper, 2026-10-12):
- Migration file: `packages/db/drizzle/0073_primary_lesson_attempts.sql` (idx 73, when 1791900000000; 0072 belongs to lane C). Hand-set journal; the snapshot `prevId` is still the 0071 id; the orchestrator fixes the chain at the merge.
- Cloudbuild files NOT changed (orchestrator sets `--required-migration 0073_primary_lesson_attempts` at the merge). Until then `primary-deploy-gate-contract.test.ts` (2 tests) and the idx test of `journal-integrity.test.ts` fail by design.
- Public `closeLessonAttempt` is the student path only (own work, reason `student_restart`). `closeAttemptInTx` is the trusted variant for S3: the caller authorizes the teacher with `managedClassBook`. The close reason `legacy_import` was added for ETL attempts.
- A close with no work (no activity rows, no steps, progress 0) writes nothing and returns `closed: false`.
- ETL: duplicates of (user, article) in `user_lesson_progress` become closed attempts (reason `legacy_import`, empty activity and step copies). The latest row that links an assignment stays current.
- Task "Tell `primary_parity_rehearsal3_20261011`": orchestrator step. Tag `0073_primary_lesson_attempts`; two cloudbuild files (`cloudbuild.yaml:52`, `cloudbuild-etl.yaml:50`).
- Real run (local, scratch db `primary_etl_repeat_s1`, dropped; legacy `primary_legacy_20261011` read only): legacy `user_lesson_progress` 289 rows, 266 (user, article) pairs, 23 pairs with duplicates, 40 rows with assignment_id. After migrate + import: `lesson_progress` 263 rows (3 skipped: user not migrated), 40 current rows with assignment_id, `primary_lesson_attempts` 23 rows (all `legacy_import`, 23 of 23 have a current row, all numbered from 1). `tutor_compat` still has 4 views. One `closeLessonAttempt` on a real student row: activity rows of the article 7 -> 1 (the left row is not a lesson type), attempts 0 -> 1, progress 100 -> 0, `xp_logs` 10 -> 10, `users.xp` 58 -> 58.
- Default used: Q1 legacy XP rule (no XP change at close); Q2/Q3 apply to S2/S3.
- User Manual Verification: none visible in the UI in this phase. Steps: run `vitest run src/primary-lesson-attempts` in `packages/domain` (10 pass); look at the 23 history rows in a migrated copy.

## Phase S2: The student starts a lesson again [checkpoint: af0f1efff]
_Story ref: spec.md#story-s2_

- [x] Task: Define the restart contract
    - [x] `restartLessonInput` (article id, optional assignment id) and `restartLessonOutput` (the new attempt number) in `packages/domain/src/primary-lesson-attempts/contracts.ts`
    - [x] Keys `Lesson.Summary.actions.startAgain`, `restarting`, the dialog texts, and `attempt` in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json` (the legacy texts for `startAgain` and `restarting`)
- [x] Task: Write the tests (red)
    - [x] Domain: `restartLesson` closes the attempt with `student_restart`; an assignment lesson sets the student assignment back to in progress and keeps the completion in the history; a teacher or another student gets FORBIDDEN
    - [x] App: `components/lesson/task/__tests__/task-lesson-summary.test.tsx` shows "Start again" and calls the action after the confirm; `components/lesson/__tests__/lesson-progress-bar.test.tsx` opens task 1 after the restart
    - [x] App: the preview mode of staff saves nothing (with the flag of `primary_parity_staff_student_view_20261011`)
    - [x] A key-parity test for the new keys in the five locale files
- [x] Task: Implement (green)
    - [x] `packages/domain/src/primary-lesson-attempts/attempts.ts`: `restartLesson`
    - [x] New `apps/primary-advantage/actions/lesson-attempts.ts`: `restartLessonAction` (thin; logs a failure with `lib/observability/logger.ts`)
    - [x] `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx` and `components/lesson/lesson-progress-bar.tsx`: the button, the dialog, the move to task 1
- [x] Task: Check the XP rule on a second pass
    - [x] Test that a task of attempt 2 writes its `user_activity` row and one new XP log (legacy rule; or the owner's answer to Member Question 1)
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S2: The student starts a lesson again' (Protocol in workflow.md)

Notes (Phase S2, helper A1, 2026-10-12):
- Commits: 55a72a4ae `restartLesson`; cc4aea3b5 locale keys + parity test; 3e7b4e932 `restartLessonAction`; 7c6e8e63a summary + progress bar; b5e0077cc XP lock test.
- `restartLesson` wraps `closeLessonAttempt` (reason `student_restart`); the check is `assertStudentRecordWriter` (STUDENT only). Output `attemptNumber` is the NEW current attempt (closed number + 1), null when nothing closed.
- The action returns `{status:"preview"}` for staff through `guardStudentAction("restart_lesson")`; the summary also skips the call in preview and shows the "Preview: not saved" toast plus the `previewNote` line.
- `TaskLessonSummary` got props `assignmentId`, `attemptNumber`, `onRestarted`. `LessonProgressBar` keeps the attempt number of the session (1, then the restart output), resets the timer, unpauses, and opens task 1. After a page reload the banner does not show: S4 must read the attempt number in `getLessonSummaryData`.
- Q1 default used: legacy XP rule (the second-pass test in `user-activity-xp.test.ts`). Q3 default used: "Start again" shows in a teacher-led class; the class-marked steps (`steps_done`) are not touched.
- Key parity: the keys were added before the parity test, so that test was not red. The XP lock test passed at once (it locks existing behavior).
- Texts: legacy for `startAgain` and `restarting` in 5 locales; the other new keys are English in all 5 locales.
- Look check pending (owner, async). Captures (24 PNG, 375/1280, day/night; states summary-first, summary-attempt2, confirm, restarting, error, preview): `~/Desktop/primary-parity-progress/captures/lesson_repeat/phaseS2/`. Real component, real chrome and rpg.css, in headless Chrome.
- Manual verification: sign in as a student, finish a lesson, press "Start Again" on task 14, check the dialog (Cancel first), confirm, check the lesson opens at task 1 and the summary of the next finish shows "Attempt 2". As staff in the student view, check that the button saves nothing.
- `build-graph update` skipped (graph.db is read only for helpers). `measure/generate.sh` and `doctor.sh` are left to the orchestrator.


## Phase S3: The teacher teaches a lesson again [checkpoint: bf19c5fdd]
_Story ref: spec.md#story-s3_

- [x] Task: Define the contract
    - [x] `teachLessonAgainInput` (class book id, lesson number) and its output (run number, closed attempt count) in `packages/domain/src/primary-books/class-book-contracts.ts`; extend `pacingLessonSchema` with `runNumber` and `earlierRuns`
    - [x] Keys for "Teach again", the dialog, and "Taught N times" in the five locale files
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/primary-books/__tests__/class-books.test.ts`: the run moves into `earlier_runs`; `taught_at` and `steps_done` are empty; the lesson is current; each student with work gets a closed attempt; a student with no work gets none; 30 mock students in one transaction; FORBIDDEN for a teacher of another class and for another school; one audit event with counts only
    - [x] `packages/domain/src/primary-books/__tests__/class-books.test.ts`: after "Teach again", `getStudentClassBooks` unlocks only the steps marked again
    - [x] `components/teacher/__tests__/class-book-pacing-controls.test.tsx`: the button shows for a taught lesson, the dialog, the call of the action
- [x] Task: Implement (green)
    - [x] `packages/domain/src/primary-books/class-books.ts`: `teachLessonAgain` (uses `managedClassBook` and the transaction variant of `closeLessonAttempt`; audit with `recordAuditEvent` of `@reading-advantage/auth`); export in `index.ts`
    - [x] `apps/primary-advantage/actions/class-books.ts`: `teachLessonAgainAction` (thin)
    - [x] `apps/primary-advantage/components/teacher/class-book-pacing-controls.tsx` and the pacing page `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/page.tsx`
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S3: The teacher teaches a lesson again' (Protocol in workflow.md)

Notes (Phase S3, helper A1, 2026-10-12):
- Commits: 1eaccc10c `teachLessonAgain` (domain, contracts, tests); ceda9dcaf action, pacing controls, page, locale keys, tests.
- `teachLessonAgain` is in the new file `packages/domain/src/primary-books/class-book-runs.ts` (exported from the index) to keep the merge with `getPreviewBook` small. `parseEarlierRuns` and the contracts are in `class-book-contracts.ts`. The domain tests are in the new file `__tests__/class-book-runs.test.ts` (not `class-books.test.ts`); the pacing and unlock tests are in `class-books.test.ts`.
- Rules: the lesson needs a taught time, a step done, or earlier runs for a new archived run. An empty current run is not archived and the run number stays (a double click adds no empty run). The lesson becomes current. Students of the class with no article link are not closed.
- Audit: `class_book:teach_again` with `lessonNumber`, `runNumber`, `studentCount`, `closedAttempts`. A failed audit write is logged and does not undo the teach. The domain package uses `console.error` for it, like `student-login/audit.ts`.
- Locale keys are in `TeacherUi.classBook` (where the lesson plan keys are), not in `Lesson.Summary`: `teachAgain`, `teachAgainTitle`, `teachAgainBody1`, `teachAgainBody2`, `teachAgainCancel`, `taughtTimes`, `runChip`, `earlierRuns`, `earlierRun`, `earlierRunNoDate`. English text in all 5 locales.
- Defaults used: Q1 a close changes no XP; Q2 "Teach again" closes the attempts of all students with work on the lesson.
- Real run (local scratch `primary_repeat_s3`, copy of `primary_parity_20261011` plus migration 0073 and seeded rows, dropped): 30 students with 3 activity rows, progress, and 4 steps each; `teachLessonAgain` took 587 ms in one transaction (about 20 ms per student); 30 attempts, run 2, `earlier_runs` has 1 item, current lesson set, 0 activity rows left, 1 audit event.
- Phase checks: domain `vitest run src/primary-books src/primary-lesson-attempts` 13 files, 134 tests pass; app `components/teacher` plus the page test 17 files, 111 tests pass; domain tsc build and app `tsc --noEmit` pass.
- Look check pending (owner, async). Captures (12 PNG, 375/1280, day/night; states lesson-plan-closed, lesson-plan-earlier-runs, dialog): `~/Desktop/primary-parity-progress/captures/lesson_repeat/phaseS3/`. Real `LessonActions`, real chrome and rpg.css; the row markup is a copy of the page (stub actions).
- Manual verification: sign in as a teacher, open a class lesson plan, mark lesson 1 taught, press "Teach again", press Cancel (nothing changes), press "Teach again" and confirm; check "Run 2", "Taught 1 time" is hidden until the lesson is taught again, and "Earlier runs (1)". Sign in as a student of the class in teacher-led mode and check that the lesson steps are locked and the student's earlier work shows as attempt 1 in the history (S4).
- `build-graph update` skipped (graph.db is read only). `measure/generate.sh` and `doctor.sh` are left to the orchestrator.


## Phase S4: The reports show the latest and the earlier attempts
_Story ref: spec.md#story-s4_

- [x] Task: Define the report contracts (3234e458f red, ffed804e2 green)
    - [x] Add `attempts` and `earlierAttempts` to the contracts of `getClassBookProgress` and `getStudentLessonSteps` in `packages/domain/src/primary-books/progress-contracts.ts`; add the `attempts` column to `toProgressCsv`
    - [x] A read `listLessonAttempts` in `packages/domain/src/primary-lesson-attempts/attempts.ts` with `progress:read:all` for staff and `progress:read:own` for the student
- [x] Task: Write the tests (red) (3234e458f domain, 255d3b798 app)
    - [x] Domain: the grid count, the drill-down list, and the CSV column; school scoping
    - [x] App: `server/models/__tests__/userModel.attempt-history.test.ts` (new) and `userModel.article-records.test.ts`: `getUserActivity` and `getUserArticleRecords` add the moved rows with their attempt number and keep the XP totals
    - [x] App: the summary shows "Attempt 2" and the XP of attempt 2 (`actions/article.ts` `getLessonSummaryData`)
    - [x] App: the pages `.../progress/page.tsx` and `.../progress/[studentId]/page.tsx` render the attempt marker and the list
- [x] Task: Implement (green) (ffed804e2 domain, d8f1c519e app)
    - [x] `packages/domain/src/primary-books/progress.ts` and `progress-contracts.ts`
    - [x] `apps/primary-advantage/server/models/userModel.ts` (`getUserActivity`, `getUserArticleRecords`) and `actions/article.ts` (`getLessonSummaryData`)
    - [x] The progress pages and their components
- [x] Task: Tell the graph session about the history table (149fb0d8d red, 1f9f2f989 green)
    - [x] Send the table name and the moved row shape for the mastery evidence job (spec Risks)
- [x] Task: Final side-by-side check (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] Run checks A1 to A5 of the spec with the acceptance kit on the rehearsal clone (2 or 3 students); send the captures to the owner (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Docs and doctor (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh` (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)
- [x] Task: Measure - User Manual Verification 'Phase S4: The reports show the latest and the earlier attempts' (Protocol in workflow.md) (closed by decision D2 on 2026-10-26; cutover acceptance: measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md; master merge beb904102)

Notes (Phase S4, helper A1, 2026-10-12):
- Commits: 3234e458f + ffed804e2 domain report contracts and counts; 255d3b798 + d8f1c519e app history rows, summary attempt, progress markers; 149fb0d8d + 1f9f2f989 evidence loader reads moved rows.
- Open: side-by-side A1-A5 run on the rehearsal clone plus captures (kit committed: `acceptance-pairs.json`, `acceptance-steps-lesson-repeat.ts`, `behavior-contract.md`, `lesson-repeat-data-checks.sql`; run is orchestrator work, never the shared copies); docs `generate.sh`/`doctor.sh` and `build-graph update` (orchestrator); manual verification.
- Phase checks: domain `vitest run` 178 files, 2066 tests pass; app `tsc --noEmit` clean.

## Phase: Review Fixes 2026-10-13
- [x] Task: M-16 attempt 2 summary counts only game runs after the last close 10d26b7a5
- [x] Task: M-17 Teach again skips roster students of another school or with no school; counts returned, app logs them c97b4988a
- [x] Task: Low: lock the student row at the start of closeAttemptInTx (`FOR UPDATE`) c97b4988a
- [x] Task: Low: Teach again and the close also match `lesson_progress.article_id` c97b4988a (no SQL-level test: the mock database cannot read a where clause)
- [x] Task: Low: no `console.error` in `class-book-runs.ts`; the output has `auditFailed` and the app logs it c97b4988a
- [x] Task: Low: "Taught 1 time" shows on a lesson taught once and then taught again c97b4988a
- [x] Task: Low: "Attempt N" tag on report rows and on /student/history cards c1b0e072a, e03b6fbc3
- [x] Task: Low: `real-run.md` written from the S1 notes (this commit)

## Phase: Manual Test Fixes 2026-10-19
- [x] Task: T5 the class book header counts a lesson taught in an earlier run (`wasTaught` in `class-books.ts`); after Teach again it said "No lessons taught yet" while lesson 1 said "Taught 1 time" 5c90c13d3
- [x] Task: U8 re-check after the rebuild: finish the quiz in two attempts, then the attempt tags on History and Reports (run 2 never finished a quiz, so no row existed); re-check 2026-10-20 pass: Reports shows "Attempt 4" and "Attempt 5", History the latest attempt per story

## Closeout (2026-10-26)

Daniel's decision D2 closed this track on 2026-10-26.
The cutover is live since 2026-10-20. Evidence: `measure/archive/primary_parity_rehearsal3_20261011/cutover-20261020.md` and the master merge `beb904102`.
The remaining tasks closed with the decision. No new work ran.