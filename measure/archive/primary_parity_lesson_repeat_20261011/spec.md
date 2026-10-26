# Spec: Teach a lesson again and start a lesson again

Track ID: `primary_parity_lesson_repeat_20261011`
Type: feature (story-shaped spec)
Triage row: STU-05 (owner choice "port", timing "before", 2026-10-11) and the follow-up decision of
2026-10-11: "Teacher 'Teach again' on the lesson plan for the class + student 'Start again'; each
finished attempt goes into a history that reports keep."

## Overview

Legacy `bfea121` has a "Start Again" button at the end of a lesson. The monorepo has no restart.
The owner notes that teachers need it most: "it was really necessary for teachers who teach the
same lesson more than once using the lesson plan feature."

This track adds two actions. A teacher clicks "Teach again" on the lesson plan of a class, and the
class starts the lesson again. A student clicks "Start again" on the lesson summary, and the student
starts the lesson again. Legacy deletes the earlier work. The new build keeps it: each closed
attempt goes into a history, and the reports show the latest attempt and the earlier attempts.

The track adds a schema change with a migration. It does not change the ETL code. It changes the
`--required-migration` value of `apps/primary-advantage/cloudbuild.yaml` and
`apps/primary-advantage/cloudbuild-etl.yaml`, which `primary_parity_rehearsal3_20261011` collects.

**Sprint goal:** A teacher teaches lesson 1 again, the students do it again, and the progress pages show attempt 2 and keep attempt 1.

## Track Set

This track is member 7 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_quick_fixes_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Legacy Behavior (`/home/daniebo/Desktop/primary-advantage` at `bfea121`)

`bfea121` itself added the restart (2026-08-10, "fix: stabilize lesson completion and restart flow").

- `app/api/lessons/[articleId]/route.ts:59-64`: a POST with `{ reset: true }` calls
  `resetStandaloneLessonProgress(user.id, articleId)`.
- `server/models/lessonModel.ts:165-211` sets the `UserLessonProgress` row (no assignment) to
  progress 0, time 0, not completed, score null, and calls `resetArticleLearningActivities`.
- `server/models/lessonModel.ts:5-16, 22-57`, in one transaction: deletes the `UserActivity` rows of
  the article for 10 types (MC, SA, LA questions; sentence flashcards, matching, ordering, word
  ordering, cloze; vocabulary flashcards, matching), and sets 7 completion flags of
  `ArticleActivityLog` to false. It keeps the read flag, the rating, and the saved flashcards.
- Assignment lessons: `server/controllers/assignmentController.ts:351-375` and
  `server/models/assignmentModel.ts:315-371` do the same and set `AssignmentStudent` to
  `IN_PROGRESS` with `completedAt` and `score` null.
- `components/lesson/task/task-lesson-summary.tsx:123-137, 480-493`: the "Start Again" button on
  task 14, next to "Back to Read Page". Keys `Lesson.Summary.actions.startAgain` and `restarting`
  in all 5 locales (en "Start Again"; th "เริ่มเรียนใหม่"; vi "Học lại"; cn "重新开始"; tw "重新開始").
- **XP rule:** legacy never removes XP. `XPLogs` and `User.xp` stay. A second pass writes new
  activity rows and new XP logs (`actions/user.ts:40-96`, `actions/question.ts:161-178`), so the
  student gets the XP again. Legacy has no server block on repeat XP.
- Legacy has no history: the reset deletes the earlier activity rows. Legacy has no teacher reset.

## Verified Facts (monorepo, integration `ca8869cea`)

- `components/lesson/task/task-lesson-summary.tsx:459-469` has one button, "Back to Read Page".
  The triage path `components/lesson/task-lesson-summary.tsx` is not correct.
- `lesson_progress` (`packages/db/src/schema/progress.ts:84-106`) has
  `unique(user_id, lesson_id)`. A standalone lesson stores the article id in `lesson_id`; an
  assignment lesson stores the assignment id (`server/models/assignmentModel.ts:441`).
- `lesson_records` (`packages/db/src/schema/stories.ts:143-169`) is a Reading Advantage table.
  Primary does not read or write it. This track does not use it.
- `user_activity` (`progress.ts:8-25`) has `unique(user_id, activity_type, target_id)`.
  `actions/user.ts:58-65` and `actions/question.ts:95-111` use a plain insert. So a second
  attempt of a task cannot write its row while the first row exists (STU-03 of
  `primary_parity_quick_fixes_20261011` changes `finishQuiz`). `user_activity` is shared with
  Reading Advantage (28 controller files), so this track does not change its key.
- `xp_logs.activity_id` (`packages/db/src/schema/analytics.ts:9-26`) is text with no foreign key.
- No Primary report reads `lesson_progress`. Reports read `user_activity` and `xp_logs`
  (`server/models/userModel.ts:213` `getUserActivity` for the teacher student report and the student reports;
  `userModel.ts:237` `getUserArticleRecords` for `/student/history`) and `primary_student_lesson_steps` (the class book
  grid, `packages/domain/src/primary-books/progress.ts:181-227`).
- Class pacing state: `primary_class_book_lessons` (`taught_at`, `steps_done`, unique per class book
  and lesson). `markStepDone` can undo a step. Nothing sets `taught_at` back to null. Nothing resets
  `primary_student_lesson_steps`. `recordLessonProgress` keeps a done step done
  (`progress.ts:39, 68`).
- The pacing page is `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/page.tsx`
  with `components/teacher/class-book-pacing-controls.tsx` (`LessonActions`, `StepChecklist`).
  `markStepDoneAction` is in `actions/class-books.ts:78-80`. `isAppStepUnlocked` is in
  `packages/domain/src/primary-books/step-map.ts:63` (called at `class-books.ts:317`).
- The highest migration is `0071_primary_temporary_password`. A new migration also needs a
  sentinel in `packages/db/src/sentinels.ts` (`journal-integrity.test.ts`), the new tag in
  `apps/primary-advantage/cloudbuild.yaml:52` (`primary-deploy-gate-contract.test.ts`), and the new
  tag in `cloudbuild-etl.yaml:50` (no test checks it).
- Tenant registry: `lessonProgress`, `userActivity`, `xpLogs`, `articleActivityLogs`,
  `primaryClassBookLessons`, `primaryStudentLessonSteps` are REFERENTIAL
  (`packages/domain/src/tenant-registry.ts`). `primaryClassBooks` is FLAT.
- The ETL moves `user_lesson_progress` into `lesson_progress` (latest row per user and article)
  and needs no change (`packages/db/src/migrations-data/primary-legacy-import.ts:677-695`).

## Design

- **Attempt history.** A new FLAT table `primary_lesson_attempts` holds one row for each closed
  attempt of one student on one article. The columns are: school, student, article, assignment
  (null), class book and lesson number (null), attempt number, started, closed, closed by, and
  close reason (`student_restart` or `teacher_teach_again`). More columns: progress, time spent,
  completed, XP earned, the moved activity rows, and the moved app step rows. The activity rows
  are JSON copies that keep their ids, so `xp_logs.activity_id` still finds them. The key is
  unique (student, article, attempt number). The current attempt number is the count of closed
  attempts plus 1.
- **Close an attempt** (domain, one transaction):
  1. Copy the rows into the history.
  2. Delete the 10 lesson activity types of the article from `user_activity` (the legacy list).
  3. Clear the 7 legacy flags of `article_activity_logs`.
  4. Set the `lesson_progress` row to 0.
  5. Delete the student's `primary_student_lesson_steps` rows of the lesson.
  XP logs and `users.xp` stay (legacy rule).
- **Class runs.** `primary_class_book_lessons` gets `run_number` (default 1) and `earlier_runs`.
  Each item of `earlier_runs` holds the taught time, the steps done, the close time, and the
  teacher. "Teach again" moves the current run into `earlier_runs` and clears `taught_at` and
  `steps_done`. It makes the lesson current. It closes the attempt of each student of the class
  who has work on the lesson.
- No change to the key of `user_activity` or `lesson_progress`.

## Stories

### Story S1: Keep each closed attempt in a history
**As a** teacher
**I want** the work of each earlier attempt kept when a lesson starts again
**So that** a second lesson never removes evidence of the first

**Acceptance Criteria:**
- Given a student with lesson activity rows, steps, and progress on an article, When `closeLessonAttempt` runs, Then one `primary_lesson_attempts` row with attempt number 1 holds these rows and the XP sum.
- Given the closed attempt, When the function ends, Then no lesson activity row of the 10 types and no step row of the lesson remain.
- Given the closed attempt, When the function ends, Then the 7 flags are false and the progress is 0.
- Given the closed attempt, When the XP is read, Then `xp_logs` and `users.xp` are the same as before the close.
- Given a failure inside the transaction, When the function stops, Then no row is changed.
- Given a student of school A, When a user of school B calls the function, Then it throws FORBIDDEN and writes nothing.
- Given the read flag, the rating, and the saved flashcards of the article, When an attempt closes, Then they do not change (legacy rule).

**Estimate:** L
**Priority:** Must

### Story S2: The student starts a lesson again
**As a** student
**I want** a "Start again" button on the lesson summary
**So that** I can do the lesson again for practice

**Acceptance Criteria:**
- Given a student on task 14 (the summary) of a lesson, When the summary shows, Then it shows "Start again" next to "Back to Read Page", with the text of each of the 5 locales.
- Given a click on "Start again", When the student confirms, Then the attempt closes with the reason `student_restart`, the lesson opens at task 1, and the summary shows "Attempt 2" after the next finish.
- Given an assignment lesson, When the student starts again, Then the assignment status of the student goes back to in progress, as in legacy, and the history keeps the earlier completion time and score.
- Given a second pass of the lesson, When the student finishes a task, Then the task writes its row and gives its XP again (legacy rule; see Member Question 1).
- Given a teacher-led class book lesson, When the student starts again, Then the workbook-first lock still follows the steps that the class marked done.
- Given staff in the student preview mode (`primary_parity_staff_student_view_20261011`), When they click "Start again", Then nothing is saved.

**Estimate:** M
**Priority:** Must

### Story S3: The teacher teaches a lesson again
**As a** teacher
**I want** a "Teach again" button on a lesson of the lesson plan of my class
**So that** I can lead the same lesson with the class a second time

**Acceptance Criteria:**
- Given a lesson that is taught or has a step done, When the teacher opens the lesson plan, Then the lesson row shows "Teach again".
- Given a click on "Teach again", When the dialog shows, Then it says that the class starts lesson N again, that each student's work goes into the history, and that XP stays; the teacher confirms or cancels.
- Given the confirmation, When the action ends, Then the run number is 2, and the earlier run keeps its taught time and steps.
- Given the same action, When it ends, Then `taught_at` is empty, no step is done, and the lesson is current.
- Given the same action, When it ends, Then each student of the class with work on the lesson has a closed attempt with the reason `teacher_teach_again`.
- Given teacher-led mode after "Teach again", When a student opens the lesson, Then only the steps that the teacher marks done again open (the lock of `isAppStepUnlocked`).
- Given a teacher who does not teach the class, or a class of another school, When the action runs, Then it throws FORBIDDEN and writes nothing.
- Given the action, When it ends, Then one audit event `class_book:teach_again` holds the class book, the lesson, and the student count, with no names.

**Estimate:** L
**Priority:** Must

### Story S4: The reports show the latest and the earlier attempts
**As a** teacher
**I want** the class progress pages and the student reports to show each attempt
**So that** I see the work of the first and the second lesson

**Acceptance Criteria:**
- Given a student with 2 attempts, When the teacher opens the class book drill-down (`.../progress/[studentId]`), Then the lesson shows the current attempt and a list of earlier attempts.
- Given an earlier attempt in the list, When the teacher reads it, Then it shows the close date, the reason, the steps done, the minutes, and the XP.
- Given the class grid (`.../progress`), When a student has earlier attempts of a lesson, Then the cell shows the attempt count, and the CSV has an `attempts` column.
- Given the teacher student report (`/teacher/student-progress/[id]`), the student reports, and `/student/history`, When they load, Then the activity list holds the moved activity rows with their attempt number, and the XP totals do not change.
- Given the lesson summary, When the student finishes attempt 2, Then the summary shows the XP of attempt 2 and the text "Attempt 2".
- Given the class pacing page, When a lesson has earlier runs, Then the lesson row shows "Taught 2 times" with the dates.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- Domain functions in a new module `packages/domain/src/primary-lesson-attempts/` (contracts,
  functions, tests, `index.ts`, export path in `packages/domain/package.json`), with Zod input and
  output contracts, `assertCan` (`progress:record` for the student, `class:update` and
  `managedClassBook` for the teacher, `progress:read:all` for reports), and TenantDB scoping.
- The server actions and the routes stay thin: they call the domain functions.
- New Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`.
- The UI uses the RPG skin kit (`components/rpg/*`): an iron button for "Start again" and "Teach
  again", a gold button for the one confirm action, 48 px or more.
- Strings in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`. "Start again" uses the legacy
  text of each locale. Thai of the new texts comes from the owner.
- One migration, generated with `drizzle-kit generate`, at the next free number (checked at the
  start of the phase).

## Acceptance Criteria (track level)

The side-by-side kit of `primary_parity_acceptance_20261011` checks these on a rehearsal copy:

| Check | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| A1 | `/student/lesson/<article>` task 14, "Start Again" | `/student/lesson/<article>` task 14, "Start again" | STUDENT | The lesson opens at task 1 with no task marked done. |
| A2 | the same, then finish task 7 | the same | STUDENT | The student gets the task XP again (legacy rule). |
| A3 | none (legacy deletes the work) | `.../books/<classBook>/progress/<student>` | TEACHER | Attempt 1 shows in the list of earlier attempts. |
| A4 | none (no teacher reset) | `.../books/<classBook>` "Teach again" | TEACHER | The lesson is current, no step is done, "Taught 1 time" shows. |
| A5 | none | `/student/lesson/<article>` after A4 | STUDENT (teacher-led class) | Only the steps that the teacher marks again open. |

- Domain tests (Vitest, `packages/domain`, with `packages/domain/src/__tests__/mock-db.ts`), db
  tests (`journal-integrity`, `primary-deploy-gate-contract`, `tenant-coverage`), and app tests
  (Vitest) pass.
- A run on a clone of the rehearsal copy proves the migration and one close with real rows.
- The owner's look check passes on captures at 375 px and 1280 px, day and night.

## Out of Scope

- A change of the key of `user_activity` or `lesson_progress`.
- The repeat of one task inside one attempt (the `user_activity` key error of a plain insert):
  `primary_parity_quick_fixes_20261011` (STU-03) owns `finishQuiz`; the same error in
  `updateUserActivity` goes to the owner as a new triage item.
- An undo of "Teach again" or of "Start again".
- The mastery evidence job (`packages/domain/src/primary-mastery/evidence-sources.ts`). See Risks.
- Lesson games (`primary_parity_lesson_games_20261011`) and print a lesson
  (`primary_parity_print_lesson_20261011`).

## Risks

- The mastery evidence job reads `user_activity`. A row that moves into the history before the job
  reads it gives no evidence. The evidence worker starts after the cutover (runbook §9 step 11),
  so this track tells the graph session about the history table.
- "Teach again" on a class of 30 students writes about 30 history rows and deletes their rows in
  one transaction. A test with 30 mock students and one run on the rehearsal clone check the time.
- The migration changes `primary_class_book_lessons`. The rehearsal 3 member must use the new
  `--required-migration` value.

## Member Questions (owner)

1. XP on a second attempt. Legacy gives the task XP again on each attempt (no server block). The
   default is the legacy rule. GP keeps its daily cap. Does the owner want XP only on the first
   attempt?
2. "Teach again" closes the attempts of all students with work on the lesson, also students who
   did not finish. Default: yes, so the class starts together. Does the owner want to close only
   the finished attempts?
3. Can a student use "Start again" in a teacher-led class, or only the teacher? Default: yes, the
   student can (legacy has it for every lesson).
