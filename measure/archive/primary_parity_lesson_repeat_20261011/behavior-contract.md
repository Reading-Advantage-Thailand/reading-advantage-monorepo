# Behavior contract — primary_parity_lesson_repeat_20261011

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| STU-05 | Start again and Teach again | port, before the cutover; teacher "Teach again" plus student "Start again"; each closed attempt goes into a history | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Lesson summary, task 14 | STUDENT | Presses "Start Again" | The lesson opens at task 1. The legacy code deletes the 10 activity types of the article and clears 7 flags. | `components/lesson/task/task-lesson-summary.tsx:123-137, 480-493`; `server/models/lessonModel.ts:5-57, 165-211` |
| Assignment lesson restart | STUDENT | Presses "Start Again" | The assignment goes back to IN_PROGRESS, completedAt and score are null. | `server/controllers/assignmentController.ts:351-375`; `server/models/assignmentModel.ts:315-371` |
| XP on a second pass | STUDENT | Finishes a task again | New activity rows and new XP logs. XP is never removed. | `actions/user.ts:40-96`; `actions/question.ts:161-178` |
| Teacher reset | TEACHER | none | Legacy has no teacher reset and no history. | none |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| `primary_lesson_attempts` | table (FLAT) | one row per closed attempt, with the moved activity and step rows | write on close; read in reports | `progress:record` (student), `class:update` plus `managedClassBook` (teacher), `progress:read:all` and `progress:read:own` (reports) | new |
| `user_activity` | table | the 10 lesson types of the article are copied, then deleted | write | same | `packages/db/src/schema/progress.ts` |
| `primary_class_book_lessons` | table | `run_number`, `earlier_runs`, `taught_at`, `steps_done` | write on "Teach again" | `class:update` | new columns |
| `xp_logs`, `users.xp` | table | unchanged at close | none | none | legacy rule |
| Audit | side effect | event `class_book:teach_again` with counts only | write | none | new |

## 4. New target

- Drizzle tables: `primary_lesson_attempts`; migration `0073_primary_lesson_attempts`.
- Domain functions: `closeLessonAttempt`, `restartLesson`, `listLessonAttempts` (`primary-lesson-attempts`); `teachLessonAgain`, `getClassBookProgress`, `getStudentLessonSteps` (`primary-books`); `loadPrimaryEvidenceEvent` reads moved rows.
- Permission action: `progress:record`, `class:update`, `progress:read:all`, `progress:read:own`.
- TenantDB class: `primary_lesson_attempts` FLAT.
- AI adapter use: none.
- RPG skin components: `components/rpg/chrome` (iron and gold buttons, Banner, Gem) on the student summary; the teacher pages use the staff shell.
- Routes: `/student/lesson/<article>` (task 14), `/teacher/class-roster/<class>/books/<classBook>`, `.../progress`, `.../progress/<student>`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| The earlier work is kept in a history, not deleted | Reports show the first and the second lesson; mastery evidence is append-only | 2026-10-11 |
| A confirm dialog before "Start again" | Prevents a lost click | design phase, look check pending |
| Teacher "Teach again" | Teachers repeat a lesson with the lesson plan | 2026-10-11 |
| Every attempt counts for mastery; reports do not split mastery by attempt | Graph session rule | 2026-10-12 |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| LR-A1 | `/en/student/lesson/<article>` task 14 | same | STUDENT | Start again opens task 1; Attempt 2 after reload | close_reason counts | batch capture (orchestrator) |
| LR-A2 | same | same | STUDENT | Task XP again; XP logs keep attempt 1 | xp_earned = xp of moved rows | batch capture (orchestrator) |
| LR-A3 | none | `.../progress/<student>` | TEACHER | Earlier attempts list; gold dot in the grid; CSV `attempts` | linked attempts | batch capture (orchestrator) |
| LR-A4 | none | `.../books/<classBook>` | TEACHER | Teach again: Run 2, no step done | run_number, audit event | batch capture (orchestrator) |
| LR-A5 | none | `/en/student/lesson/<article>` | STUDENT | Only steps marked again open | step rows 0 | batch capture (orchestrator) |

SQL: `lesson-repeat-data-checks.sql`. Steps: `acceptance-steps-lesson-repeat.ts`.

## 7. ETL and runbook changes

- Cloud Build `--required-migration` is `0073_primary_lesson_attempts` in `cloudbuild.yaml` and `cloudbuild-etl.yaml` (orchestrator set it at the merge).
- The ETL turns duplicate `user_lesson_progress` rows into `legacy_import` attempts (S1).
- No new cutover check. Run `lesson-repeat-data-checks.sql` after the browser check on the rehearsal copy.
