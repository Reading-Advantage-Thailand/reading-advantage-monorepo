# Plan: Teach a lesson again and start a lesson again

Track: `primary_parity_lesson_repeat_20261011`. Branch: a lane branch from `primary-parity-integration`
after `primary_parity_quick_fixes_20261011` (STU-02, STU-03, STU-17 change the lesson flow and
`finishQuiz`). Tell the monorepo session before any write to `primary-parity-integration`. Run one
heavy job at a time. Every task follows the TDD order of `measure/workflow.md`.

## Phase D: Design (RPG skin)

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

## Phase S1: Keep each closed attempt in a history
_Story ref: spec.md#story-s1_

- [ ] Task: Define the schema and the contracts
    - [ ] New `packages/db/src/schema/primary-lesson-attempts.ts` (`primary_lesson_attempts`, spec "Design"); export it in `packages/db/src/schema/index.ts`
    - [ ] Add `run_number` and `earlier_runs` to `primaryClassBookLessons` in `packages/db/src/schema/primary-books.ts`
    - [ ] Classify `primaryLessonAttempts` as FLAT in `packages/domain/src/tenant-registry.ts`
    - [ ] New `packages/domain/src/primary-lesson-attempts/contracts.ts`: `closeLessonAttemptInput`, `lessonAttemptSchema`, `LESSON_ACTIVITY_TYPES` (the 10 legacy types), `closeReasonSchema`
- [ ] Task: Generate the migration
    - [ ] Check the next free number in `packages/db/drizzle/` at the start of the phase; run `pnpm --filter @reading-advantage/db generate`; review the SQL (additive only)
    - [ ] Add the sentinel in `packages/db/src/sentinels.ts`; set the new tag in `apps/primary-advantage/cloudbuild.yaml` and `apps/primary-advantage/cloudbuild-etl.yaml` (`--required-migration`)
    - [ ] Run `journal-integrity.test.ts`, `primary-deploy-gate-contract.test.ts`, and `tenant-coverage.test.ts`
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-lesson-attempts/__tests__/attempts.test.ts` with `packages/domain/src/__tests__/mock-db.ts`: the history row and its attempt number; the deletes and the flag reset; XP logs and `users.xp` unchanged; read flag, rating, flashcards unchanged; a transaction failure writes nothing; another school gives FORBIDDEN
- [ ] Task: Implement `closeLessonAttempt` (green)
    - [ ] `packages/domain/src/primary-lesson-attempts/attempts.ts`: one transaction through `createTenantDB(...).unscoped("<reason>")` for the REFERENTIAL tables; a transaction-level variant for "Teach again"
    - [ ] `packages/domain/src/primary-lesson-attempts/index.ts` and the export path in `packages/domain/package.json`
- [ ] Task: Prove the migration and one close on real rows
    - [ ] Clone the rehearsal copy (`create database <clone> template <rehearsal copy>`; never the shared `primary_advantage`); migrate; close one attempt of one demo student; record the rows in `measure/tracks/primary_parity_lesson_repeat_20261011/real-run.md`
    - [ ] Tell `primary_parity_rehearsal3_20261011` the new migration tag and the two config changes
- [ ] Task: Docs and doctor
    - [ ] JSDoc on every export; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Keep each closed attempt in a history' (Protocol in workflow.md)

## Phase S2: The student starts a lesson again
_Story ref: spec.md#story-s2_

- [ ] Task: Define the restart contract
    - [ ] `restartLessonInput` (article id, optional assignment id) and `restartLessonOutput` (the new attempt number) in `packages/domain/src/primary-lesson-attempts/contracts.ts`
    - [ ] Keys `Lesson.Summary.actions.startAgain`, `restarting`, the dialog texts, and `attempt` in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json` (the legacy texts for `startAgain` and `restarting`)
- [ ] Task: Write the tests (red)
    - [ ] Domain: `restartLesson` closes the attempt with `student_restart`; an assignment lesson sets the student assignment back to in progress and keeps the completion in the history; a teacher or another student gets FORBIDDEN
    - [ ] App: `components/lesson/task/__tests__/task-lesson-summary.test.tsx` shows "Start again" and calls the action after the confirm; `components/lesson/__tests__/lesson-progress-bar.test.tsx` opens task 1 after the restart
    - [ ] App: the preview mode of staff saves nothing (with the flag of `primary_parity_staff_student_view_20261011`)
    - [ ] A key-parity test for the new keys in the five locale files
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-lesson-attempts/attempts.ts`: `restartLesson`
    - [ ] New `apps/primary-advantage/actions/lesson-attempts.ts`: `restartLessonAction` (thin; logs a failure with `lib/observability/logger.ts`)
    - [ ] `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx` and `components/lesson/lesson-progress-bar.tsx`: the button, the dialog, the move to task 1
- [ ] Task: Check the XP rule on a second pass
    - [ ] Test that a task of attempt 2 writes its `user_activity` row and one new XP log (legacy rule; or the owner's answer to Member Question 1)
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: The student starts a lesson again' (Protocol in workflow.md)

## Phase S3: The teacher teaches a lesson again
_Story ref: spec.md#story-s3_

- [ ] Task: Define the contract
    - [ ] `teachLessonAgainInput` (class book id, lesson number) and its output (run number, closed attempt count) in `packages/domain/src/primary-books/class-book-contracts.ts`; extend `pacingLessonSchema` with `runNumber` and `earlierRuns`
    - [ ] Keys for "Teach again", the dialog, and "Taught N times" in the five locale files
- [ ] Task: Write the tests (red)
    - [ ] `packages/domain/src/primary-books/__tests__/class-books.test.ts`: the run moves into `earlier_runs`; `taught_at` and `steps_done` are empty; the lesson is current; each student with work gets a closed attempt; a student with no work gets none; 30 mock students in one transaction; FORBIDDEN for a teacher of another class and for another school; one audit event with counts only
    - [ ] `packages/domain/src/primary-books/__tests__/class-books.test.ts`: after "Teach again", `getStudentClassBooks` unlocks only the steps marked again
    - [ ] `components/teacher/__tests__/class-book-pacing-controls.test.tsx`: the button shows for a taught lesson, the dialog, the call of the action
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/class-books.ts`: `teachLessonAgain` (uses `managedClassBook` and the transaction variant of `closeLessonAttempt`; audit with `recordAuditEvent` of `@reading-advantage/auth`); export in `index.ts`
    - [ ] `apps/primary-advantage/actions/class-books.ts`: `teachLessonAgainAction` (thin)
    - [ ] `apps/primary-advantage/components/teacher/class-book-pacing-controls.tsx` and the pacing page `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/page.tsx`
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S3: The teacher teaches a lesson again' (Protocol in workflow.md)

## Phase S4: The reports show the latest and the earlier attempts
_Story ref: spec.md#story-s4_

- [ ] Task: Define the report contracts
    - [ ] Add `attempts` and `earlierAttempts` to the contracts of `getClassBookProgress` and `getStudentLessonSteps` in `packages/domain/src/primary-books/progress-contracts.ts`; add the `attempts` column to `toProgressCsv`
    - [ ] A read `listLessonAttempts` in `packages/domain/src/primary-lesson-attempts/attempts.ts` with `progress:read:all` for staff and `progress:read:own` for the student
- [ ] Task: Write the tests (red)
    - [ ] Domain: the grid count, the drill-down list, and the CSV column; school scoping
    - [ ] App: `server/models/__tests__/userModel.test.ts` (or the existing test): `getUserActivity` and `getUserArticleRecords` add the moved rows with their attempt number and keep the XP totals
    - [ ] App: the summary shows "Attempt 2" and the XP of attempt 2 (`actions/article.ts` `getLessonSummaryData`)
    - [ ] App: the pages `.../progress/page.tsx` and `.../progress/[studentId]/page.tsx` render the attempt marker and the list
- [ ] Task: Implement (green)
    - [ ] `packages/domain/src/primary-books/progress.ts` and `progress-contracts.ts`
    - [ ] `apps/primary-advantage/server/models/userModel.ts` (`getUserActivity`, `getUserArticleRecords`) and `actions/article.ts` (`getLessonSummaryData`)
    - [ ] The progress pages and their components
- [ ] Task: Tell the graph session about the history table
    - [ ] Send the table name and the moved row shape for the mastery evidence job (spec Risks)
- [ ] Task: Final side-by-side check
    - [ ] Run checks A1 to A5 of the spec with the acceptance kit on the rehearsal clone (2 or 3 students); send the captures to the owner
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: The reports show the latest and the earlier attempts' (Protocol in workflow.md)
