# Spec — Primary parity quick fixes

Track ID: `primary_parity_quick_fixes_20261011`
Type: bug (Classic FR list)
Triage rows: ADM-02, ADM-06, TCH-05, TCH-08, STU-02, STU-03, STU-06, STU-07, STU-08, STU-16, STU-17,
PUB-04, PUB-05 (owner choice "port" or "extend", timing "before", 2026-10-11).

## Overview

Thirteen small regressions and bugs make the new Primary build do less than legacy `bfea121`. Some
of them stop migrated students: a lesson resumes on an empty task, and a quiz cannot finish. Others
give wrong data: the "saved" chip shows the state of other students, and game XP does not reach the
home XP. This track fixes each row. Each fix starts with a failing test that shows the defect.

Each FR has one triage row. The FRs are in four groups: admin, teacher, student, and public. A fix
changes the layer that has the defect. A fix does not move code to another layer, except where the
FR says so. The verified facts that differ from the triage text are in "Evidence corrections".

## Track Set

This track is member 2 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Rules for this track

- R-1. No schema change, no Drizzle migration, no ETL change, and no runbook change. The fixes read
  the stored values as they are. If a task finds that it needs one of these changes, stop and ask the
  owner. `primary_parity_rehearsal3_20261011` gets nothing from this track.
- R-2. New Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`
  (`logger.error(event, payload)`), never with `console.error`.
- R-3. Every new or changed message key has values in `en`, `th`, `cn`, `tw`, and `vi`
  (`apps/primary-advantage/messages/*.json`). Where legacy has the string, take the legacy value
  (`/home/daniebo/Desktop/primary-advantage/messages/<locale>/<locale>.json`).
- R-4. Tests: Vitest. App tests are in `apps/primary-advantage/**/__tests__/` (the include list of
  `apps/primary-advantage/vitest.config.ts`). Domain tests use the mock helper
  `packages/domain/src/__tests__/mock-db.ts`.
- R-5. Every exported function, type, and schema has JSDoc (`AGENTS.md`).

## Functional Requirements

### Admin

- **FR-1 (ADM-02). The admin can edit a class again.**
  - Defect: the admin edit dialog sends `{name, grade, classCode, passwordStudents}` by PATCH to
    `/api/classroom/[id]` (`components/admin/classrooms-table.tsx:178-213`). The controller reads
    `classroomName` (`server/controllers/classroomController.ts:159-166`), so every edit gets 400
    "Classroom name is required". The teacher page sends `classroomName` and works
    (`components/teacher/my-classes.tsx:132-141`).
  - Legacy: PUT `/api/classrooms/[id]` with the name, the grade, the class password, and
    `assignedTeacherIds` (legacy `app/api/classrooms/[id]/route.ts:4`, `server/models/classroomModel.ts:436-444`).
  - Fix:
    1. A Zod contract `updateClassroomBodySchema` in `apps/primary-advantage/lib/zod.ts`:
       `classroomName` (trimmed, 1 to 100 characters) and `grade` (optional, an integer from 1 to 12
       as a string). The controller parses the body with it and returns 400 with the field errors.
    2. The admin dialog sends `classroomName` and `grade`. The grade field uses the same grade select
       as the create dialog (`classrooms-table.tsx:332-350`), not a free text field.
    3. The "Student password" field: member question Q1 decides. The recommended answer is to remove
       the field from the dialog, because no sign-in path reads `classrooms.password_students` now
       (see Evidence corrections, E-1). If the owner keeps it, the contract gets `passwordStudents`
       and `updateClassroom` (`server/models/classroomModel.ts:528-597`) saves it.
  - The teacher picker (`assignedTeacherIds`) is ADM-03 in `primary_parity_school_management_20261011`.
- **FR-2 (ADM-06). The students page tells the admin the result of each change.**
  - Defect: `app/[locale]/admin/students/page.tsx` has no toast. A failed add, edit, or delete goes to
    `console.error` only (`:269`, `:318`, `:352`).
  - Legacy: `toast.success` and `toast.error` for add, edit, and delete, with the server `error`
    text when the response has one (legacy `app/[locale]/admin/students/page.tsx:280-356`).
  - Fix: the same six toasts with `sonner` (the page already has it as a dependency). The error toast
    shows the translated message as its title and the server `error` text as its description, when
    the response has one. The keys `AdminStudents.toasts.{addSuccess, addError, updateSuccess,
    updateError, deleteSuccess, deleteError, fetchError}` are missing in all five monorepo files. Add
    them from the legacy files (R-3).
  - The email column stays removed (owner rule of 2026-10-08).

### Teacher

- **FR-3 (TCH-05). The reports overview has the "Active this week" tile again.**
  - Defect: `components/teacher/teacher-progress-reports.tsx:291-295` shows three tiles. The fourth
    tile of legacy is gone.
  - Legacy: the fourth tile shows the percent of students with activity in the last 7 days, and
    "{count} of {total} students" (legacy `components/teacher/teacher-progress-reports.tsx:150-167`,
    `:335-354`). In legacy the tile always shows 0 %, because the student list has no `lastActivity`
    field (E-3).
  - Fix:
    1. The three student-list reads (`getAllStudentsByTeacher`, `getAllStudentsByAdmin`,
       `getAllStudentsInSystem` in `server/models/classroomModel.ts:678-900`) add `lastActivity`: the
       newest `created_at` of the student's `user_activity` and `xp_logs` rows. One grouped query for
       all student ids of the list, on the pattern of the class roster read (`:960-975`). The list
       stays scoped by the school of the caller, as today.
    2. The tile list gets the fourth tile with the existing keys `Reports.progress.activeThisWeek` and
       `Reports.progress.activeThisWeekDescription`. "Active" means a `lastActivity` in the last 7 days
       (rolling, from the time of the page load). The tile follows the class filter and the search, as
       the other tiles do.
- **FR-4 (TCH-08). The class page "Settings" link opens the edit dialog of the class.**
  - Defect: `components/teacher/classroom-navigation.tsx:65` links to `/teacher/my-classes?edit=<id>`.
    `components/teacher/my-classes.tsx` ignores `edit`. Legacy has the same dead link (legacy
    `components/teacher/classroom-navigation.tsx:71`).
  - Fix: after the class list loads, `MyClasses` reads `edit` with `useSearchParams`. When the id is
    one of the listed classes, it opens the edit dialog with the name and the grade of that class
    (`my-classes.tsx:274-280` sets the same state). When the id is not in the list, the page shows the
    list only. When the dialog closes, the page removes `edit` from the URL (`router.replace`), so a
    reload does not open it again.

### Student

- **FR-5 (STU-02). A lesson resumes on the task that the student saved.**
  - Defect: `components/lesson/lesson-progress-bar.tsx:157-171` converts the stored percent with
    `Math.ceil(progress / (100 / 14))`. Progress 0 on an assignment opens task 0 (an empty task with no
    buttons). Progress 93 (saved at task 13) opens task 14, the summary. The summary then has no Next
    button, and the progress never reaches 100, so the assignment stays `IN_PROGRESS`.
  - Legacy: `components/lesson/lesson-progress-utils.ts` (legacy, 36 lines):
    `getLessonTaskFromProgress` gives task 1 for progress 0 or less, else
    `min(14, max(2, round(min(progress, 100) / 100 * 14)))`. `getLessonProgressForTask` gives 0 for
    task 1, else `round(task / 14 * 100)`. Legacy has no test for this file.
  - Fix: port the two rules to `apps/primary-advantage/lib/lesson-progress.ts` (a pure module, safe
    for the client bundle). `lesson-progress-bar.tsx` uses `getLessonTaskFromProgress` on load
    (`:157-171`) and `getLessonProgressForTask` on each save (`:229`, `:317`). The page pauses the
    timer only when the resumed task is 14.
  - The stored values do not change (R-1). The rule reads the old values correctly: 7 (the old start
    value) gives task 2.
- **FR-6 (STU-03). A quiz finishes when a row for it already exists.**
  - Defect: `finishQuiz` (`actions/question.ts:95-114`) inserts a `user_activity` row. The unique key
    (`user_id`, `activity_type`, `target_id`) in `packages/db/src/schema/progress.ts:24` refuses the
    insert when a row exists. This happens with a migrated `completed = false` row and with a double
    click. The XP write runs after the insert and outside one transaction.
  - Legacy: `finishQuiz` finds a `completed = false` row of the same user, type, and article, and
    updates it; else it creates a row (legacy `actions/question.ts:65-114`). Legacy has no unique key,
    so a double click gives a second row and XP two times (E-4).
  - Fix: one transaction for the activity row, the article log, the XP log, the GP grant, and the
    `users` update. The activity write is an upsert on the unique key that sets the details, the
    timer, and `completed = true` only where `completed = false`. When the row was already complete,
    `finishQuiz` returns success and writes no XP log and no XP, because
    `xp_logs_user_activity_unique` (`packages/db/src/schema/analytics.ts:25`) refuses a second XP log
    for the same activity row. `retakeQuiz` (`actions/question.ts:23-58`) does not change. The
    evidence job (`enqueuePrimaryEvidenceJob`) runs only when the row changed.
- **FR-7 (STU-17). Lesson task 8 shows the saved short answer again.**
  - Defect: `components/lesson/practice/lesson-task-saq.tsx:40-46` always opens the empty form. A
    student who goes back to task 8 does not see the answer and the feedback.
  - Legacy: the task reads `/api/articles/questions/<id>?articleId=<id>&questionType=SA_QUESTION`. When
    the status is `COMPLETED`, it shows the saved details and pauses the timer (legacy
    `components/lesson/pratice/lesson-task-saq.tsx:38-90`).
  - Fix: the same read through the existing route `app/api/articles/questions/[articleId]/route.ts`
    (it returns `questionStatus` and `result.details`, `server/models/articleModel.ts:510-533`). The
    completed view shows the saved question, answer, suggested answer, feedback, and score. A failed
    read shows the empty form, as legacy does.
- **FR-8 (STU-06). A student can change the display name. The sign-in username stays permanent.**
  - Defect: the settings form (`components/change-username-form.tsx:50-53`) sends PATCH
    `/api/users/[id]`. That route needs ADMIN or SYSTEM (`app/api/users/[id]/route.ts:25-36`), so a
    student gets 403. The form shows no error (the error toast is in a comment, `:65-70`). The form
    labels the display name "Username", and the read-only sign-in username below it has the same
    label (`app/[locale]/(student)/settings/user-profile/page.tsx:51-58`).
  - Legacy: PATCH `/api/users/[id]` lets a user change their own `name` (legacy
    `app/api/users/[id]/route.ts:19-30`, `components/change-username-form.tsx`).
  - Fix:
    1. Contract: `updateOwnDisplayNameBodySchema` in `lib/zod.ts`: `name`, trimmed, 2 to 40
       characters. The maximum is the maximum of the class name list (`packages/domain/src/student-login/contracts.ts:64`).
    2. A self-only route `PATCH /api/users/me` (`app/api/users/me/route.ts`). It uses the session
       user only and takes no user id from the request. It calls the domain function `updateUser`
       (`packages/domain/src/users/mutations.ts:17-52`) with the caller's id and the new `name`, through
       `getTenantDB` for a user with a school. A session with `authStrength` `code_only` gets 403,
       because profile changes need a `full` sign-in (student login spec, Design 6;
       `lib/auth-strength.ts:7-11`). The route never changes `users.username` or
       `users.display_username` (owner rule of 2026-10-08).
    3. The form sends to the new route, labels the field "Display name" (new key
       `Settings.userProfile.displayName` and `displayNameDescription`), and shows an error toast on
       a failure. The page labels the read-only field "Sign-in username" (new key
       `Settings.userProfile.signInUsername`).
  - `/api/users/[id]` keeps its ADMIN and SYSTEM rule (security track FR-1).
- **FR-9 (STU-07). The article text shows every sentence.**
  - Defect: `components/articles/article-content.tsx:958-986` puts a sentence in a paragraph only when
    the paragraph text contains it. A sentence that matches no paragraph does not show. A short
    sentence that two paragraphs contain shows two times. The lesson reading task has the same code
    (`components/lesson/task/task-reading.tsx:393-420`, E-6).
  - Legacy: `lib/paragraph-utils.ts` (legacy commit `9572a7d`) puts the sentences, in order, into 3
    blocks (`bucketItems`: the first blocks get the extra sentences, for example 7 gives 3, 2, 2). An
    article with no `sentences` array splits the passage into sentences first
    (`splitPassageIntoSentences`). Legacy `lib/paragraph-utils.test.ts` tests it.
  - Fix: port the functions to `apps/primary-advantage/lib/paragraph-utils.ts` and the test cases to
    `apps/primary-advantage/lib/__tests__/paragraph-utils.test.ts`. `article-content.tsx` and
    `task-reading.tsx` use them. Each block keeps its picture (`getArticleImageUrl(article, n)`), so
    an article shows 3 pictures at most. The word highlight and the audio seek keep the sentence index.
- **FR-10 (STU-08). Game XP goes into the student's XP.**
  - Defect: `recordGameCompletion` (`packages/domain/src/games/mutations.ts:124-175`) writes
    `game_completions`, `xp_logs`, and GP, but not `users.xp`. The home XP, the header gem, and the
    level read `users.xp` (`packages/domain/src/primary-home/home.ts:46`). The monthly leaderboard
    reads `xp_logs`, so the two numbers do not agree.
  - Legacy: each game route adds the score to `users.xp` in its transaction (legacy
    `app/api/games/rune-match/complete/route.ts:32-35`, `xp: { increment: score }`). Legacy does not
    change the level or the CEFR level on a game.
  - Fix: `recordGameCompletion` gets a second parameter, `options.addToUserXp` (default `false`). It
    is not part of the client contract `gameCompletionInputSchema` (it stays `.strict()`). When it is
    `true`, the same transaction adds `xpEarned` to `users.xp` with a SQL increment, only when the
    completion row is new. A duplicate adds nothing. The Primary route
    `app/api/v1/apk/complete/route.ts:60-65` passes `true`. Reading Advantage and Advantage Games call
    the same function and keep the default (E-7).
- **FR-11 (STU-16). The "saved" chip shows the student's own state, and the article page saves with
  the legacy rule.**
  - Defect: `components/articles/article-card.tsx:40-42` shows the chip when any user has
    `isSentenceAndWordsSaved` on the article. `getArticleById` (`server/models/articleModel.ts:436-460`)
    loads the article logs of every user. The read page saves all words of the article
    (`app/[locale]/(student)/student/read/[articleId]/page.tsx:114-129` calls
    `saveArticleToFlashcard`, `actions/flashcard.ts:865-943`).
  - Legacy: the article load keeps only the logs of the signed-in user (legacy
    `server/models/articleModel.ts:387-388`). The chip reads the student's own decks and shows "Saved"
    or "Not saved" (legacy `components/articles/flashcard-saved-badge.tsx`, `/api/flashcard/article`
    GET). The save runs when the MCQ, SAQ, and LAQ are all complete (legacy
    `hooks/use-auto-save-flashcard.ts`, commit `56531cc`). It saves 3, 4, or 5 random words that are
    not in the student's vocabulary deck yet (case-insensitive, any article), and all sentences, when
    the deck has none of them for this article. Then it marks the article log saved (legacy
    `server/controllers/flashcardController.ts:237-339`).
  - Fix:
    1. `getArticleById(articleId, userId)` returns only the logs of `userId`. Without a user it returns
       no log. This also stops the leak of other users' logs to the browser (E-8).
    2. A domain function `saveArticleCardsAfterQuiz` in
       `packages/domain/src/games/primary-article-cards.ts`, exported from `@reading-advantage/domain/games`,
       with Zod input (`articleId`, uuid) and output (`wordsCreated`, `sentencesCreated`,
       `alreadySaved`). It refuses a user who is not a STUDENT (the staff view saves nothing, shared
       decision of 2026-10-11, STU-01). It runs the legacy rule above in one transaction. The random
       choice is a parameter, so the test can fix it. The card rows have the same shape as the rows of
       `saveFlashcard` (`actions/flashcard.ts:206-300`): the reader and the games read them
       (`listPrimaryDeckCards`, `listPrimaryArticleCards` in `primary-saved-items.ts`).
       `flashcard_decks`, `flashcard_cards`, and `article_activity_logs` are REFERENTIAL, so the
       function uses `tenantDb.unscoped("<reason>")` with a `user_id` filter on each query.
    3. A domain read `getArticleCardState` (same file): `saved` is true when the student's log has
       `isSentenceAndWordsSaved`, or a deck of the student has a card of the article.
    4. The read page calls the new function instead of `saveArticleToFlashcard`, and passes the state
       to `ArticleCard`. The chip shows "Saved" or "Not saved" (existing keys `Article.saveToFlashcard`
       and `Article.notSaved`).
  - The lesson (task 7) keeps `saveArticleToFlashcard`, which saves all words. Legacy does the same
    in the lesson (legacy `components/lesson/lesson-progress-bar.tsx:239`).

### Public

- **FR-12 (PUB-04). The footer "Support" link goes to `/contact`, and the email is
  `support@reading-advantage.com`.**
  - Defect on integration: `components/index/footer.tsx:26-29` links "Support" to a Google Form, and
    `:42-45` shows `admin@reading-advantage.com`.
  - Legacy: "Support" goes to `/contact` (legacy `components/index/footer.tsx:78-86`); the email is
    `support@reading-advantage.com` (`:31-34`). The single source is
    `~/Desktop/advantage-pr/01-company/contact-and-locations.md` (v2.1, 2026-10-07, "General contact").
  - Branch check: `primary/public-pages` (worktree `/home/daniebo/Desktop/rama-worktrees/public-pages`,
    head `5e7425fd5`) rewrites `footer.tsx`. Its contact group reads `CONTACT_CHANNELS.email`
    (`configs/contact-channels.ts`), which is `support@reading-advantage.com`. Its "Support" link still
    goes to the Google Form. A change of `footer.tsx` on integration gives a merge conflict with the
    branch.
  - Fix: one commit on `primary/public-pages`: the "Support" link goes to `/contact`. Integration gets
    no change of `footer.tsx`. The branch merges into integration before rehearsal 3 (PUB-01). If the
    owner wants the fix on integration before that merge, do the same edit on integration and keep
    the branch version of the file at the merge.
- **FR-13 (PUB-05). A sign-in link with `?classroom_code=` fills the class code step.**
  - Defect: the student sign-in (`components/student-login/code-sign-in.tsx`) does not read the
    query.
  - Legacy: `components/auth/student-signin-form.tsx:42-80` reads `classroom_code`, loads the name list
    of that class, and opens the name step.
  - Fix: `CodeSignIn` reads `classroom_code` with `useSearchParams` once (a ref guard, for the React
    Strict Mode double effect). It removes spaces and uses upper case. A value of `CLASS_CODE_LENGTH`
    (6) characters goes into the input and is sent once, as a typed code is (`submitCode`,
    `:128-144`). A wrong code shows the existing "codeInvalid" message. A value with another length
    does not go into the input. The step then shows a short note (new key
    `StudentSignIn.code.oldLink`): "This link has an old class code. Type the code that your teacher
    shows." Member question Q2 can change this.

## Migrated data: side-by-side checks on the rehearsal copy

These fixes read rows that the ETL moves. The acceptance kit (`primary_parity_acceptance_20261011`)
checks them on a matched pair of copies, with the same accounts in both apps.

| FR | Migrated rows | Check on the rehearsal copy |
| --- | --- | --- |
| FR-1 | `classrooms` (name, grade, `password_students`) | An admin renames a migrated class and changes the grade. The class list shows the new values. |
| FR-3 | `user_activity`, `xp_logs` | The tile counts the same students as a manual query of the last 7 days. Make one activity in both apps first, because the copy has old dates. |
| FR-5 | `lesson_progress.progress` (legacy values) | A migrated student with a lesson in progress opens the same task in both apps. |
| FR-6 | `user_activity` with `completed = false` | A migrated student finishes the quiz of that article in both apps. |
| FR-7 | `user_activity` SA rows, `details` jsonb | A migrated student with a finished SAQ opens task 8 and sees the same answer in both apps. |
| FR-9 | `articles.sentences`, `articles.passage` | Three migrated articles show the same sentences in the same order in both apps. |
| FR-10 | `users.xp` | A game adds its `xpEarned` to the migrated XP. The home and the header show the new total. |
| FR-11 | `article_activity_logs`, `flashcard_decks`, `flashcard_cards` | The chip of a migrated student shows the same state as the legacy chip, for a saved and an unsaved article. |
| FR-13 | `classrooms.password_students` | An old link with a migrated class code shows the note of FR-13. |

FR-2, FR-4, FR-8, and FR-12 read no migrated row that needs a pair check. FR-8 changes `users.name`
only, on a test student of the copy.

## Evidence corrections

The triage text differs from the code in these places (checked 2026-10-11, integration `ca8869cea`,
legacy `bfea121`):

- E-1 (ADM-02). `passwordStudents` is the legacy class code. Legacy students type it to sign in
  (legacy `lib/auth.ts:127-128`). The new sign-in uses a teacher-started 6-character session code
  (`primary_class_login_sessions`, `packages/domain/src/student-login/contracts.ts:7`). No sign-in path
  of the new app reads `classrooms.password_students`. So "save the password" has no effect for a
  student.
- E-2 (ADM-06). The `AdminStudents.toasts` keys are missing in all five monorepo message files. Putting
  the toasts back needs the keys too.
- E-3 (TCH-05). The legacy tile always showed 0 %. It reads `student.lastActivity`, but legacy
  `getAllStudentsByTeacher` (legacy `server/models/classroomModel.ts:534-594`) returns no such field.
  The side-by-side check of FR-3 must not expect the legacy number.
- E-4 (STU-03). Legacy has no unique key on `UserActivity` (only an index). A double click in legacy
  gave a second row and XP two times. The new fix gives XP one time.
- E-5 (STU-06). `/settings/user-profile` is in `FULL_AUTH_ONLY_ROUTES` (`lib/auth-strength.ts:7-11`),
  but no code checks it. The new route checks the strength itself.
- E-6 (STU-07). The same paragraph bug is in the lesson reading task (`task-reading.tsx:407`). Legacy
  has it in its lesson too (legacy `task-first-reading.tsx:316`, `task-deep-reading.tsx:391`). FR-9
  fixes both places with the same functions.
- E-7 (STU-08). `recordGameCompletion` is shared. Reading Advantage
  (`apps/reading-advantage/app/api/v1/apk/complete/route.ts:62`) and Advantage Games
  (`apps/advantage-games/src/lib/apk/completion-dependencies.ts:7`) call it. A change without an
  option changes their XP too.
- E-8 (STU-16). The article logs of all users reach the browser. `ArticleContent` is a client
  component, and it gets the article object with `articleActivityLog`
  (`components/articles/article-card.tsx:66`). `/api/articles/[articleId]` GET returns the same object
  with no session check (`app/api/articles/[articleId]/route.ts`; `/api/*` is outside the proxy
  matcher, `proxy.ts:96-97`). FR-11 item 1 removes the other users' logs from both paths. The route
  without a session stays (Out of Scope).
- E-9 (STU-02). The count "238 lesson progress rows" is not checked here, because this track runs no
  database command.

## Member questions (for the owner)

- Q1 (FR-1). The "Student password" field of the admin class dialog does nothing since the new
  student sign-in. Remove it (recommended), or keep it and save it?
- Q2 (FR-13). Legacy class codes have 8 characters and do not sign in to the new app. No page of
  either app makes a `?classroom_code=` link (only legacy reads it). Keep the prefill for new 6-character
  codes with the note for old links (recommended), or drop PUB-05?

## Non-Functional Requirements

- NFR-1. Each FR has a test that fails before its fix and passes after it (`measure/workflow.md`, TDD).
- NFR-2. Student pages keep the RPG skin (`docs/primary-rpg-skin.md`): 48 px targets, 375 px and
  1280 px, day and night.
- NFR-3. No local run with 25 students. Use 2 or 3 students, or the rehearsal environment. One heavy
  job at a time (tsc, build, or a browser run).
- NFR-4. Commit subjects: `fix(primary): <subject> (track_id: primary_parity_quick_fixes_20261011)`.
  The header and each body line have 100 characters or less.

## Acceptance Criteria

The acceptance kit writes these rows into `measure/tracks/primary_parity_quick_fixes_20261011/acceptance-pairs.json`.
Each row names the legacy page, the new page, the role, and the observable behavior.

| Row | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| AC-1 (FR-1) | `/en/admin/students/classrooms`, edit | same route, edit | ADMIN | The edit saves the new name and grade. The list shows them. No 400. |
| AC-2 (FR-2) | `/en/admin/students` | same route | ADMIN | Add, edit, and delete each show a success toast. A failed call shows an error toast. |
| AC-3 (FR-3) | `/en/teacher/reports` | same route | TEACHER | Four tiles. The fourth tile shows the percent and "n of m students" active in 7 days. (Legacy shows 0 %, E-3.) |
| AC-4 (FR-4) | `/en/teacher/class-roster/<id>` → Settings | same route → Settings | TEACHER | The new app opens the edit dialog of that class. Legacy opens the list only. |
| AC-5 (FR-5) | `/en/student/lesson/<articleId>` | same route | STUDENT | A lesson saved at task 13 opens task 13 with a Next button. A lesson with progress 0 opens task 1. |
| AC-6 (FR-6) | the article quiz | same | STUDENT | A quiz with a migrated `completed = false` row finishes. A double click gives XP one time. |
| AC-7 (FR-7) | `/en/student/lesson/<articleId>`, task 8 | same | STUDENT | A finished SAQ shows the saved answer, the feedback, and the score. |
| AC-8 (FR-8) | `/en/settings/user-profile` | same route | STUDENT | The student changes the display name. The header shows it. The sign-in username does not change. A code-only session gets an error message. |
| AC-9 (FR-9) | `/en/student/read/<articleId>` | same route | STUDENT | Every sentence of the article shows one time, in order, in 3 blocks. |
| AC-10 (FR-10) | a game (legacy `/en/student/games/vocabulary/rune-match`) | `/en/student/games/apk/rune-match` | STUDENT | The home XP and the header gem rise by the `xpEarned` of the completion. |
| AC-11 (FR-11) | `/en/student/read/<articleId>` | same route | STUDENT | The chip shows the student's own state. After the three quizzes, 3 to 5 new words and all sentences are in the decks. |
| AC-12 (FR-12) | `/en` footer | `/en` footer | PUBLIC | "Support" opens `/contact`. The email link is `mailto:support@reading-advantage.com`. |
| AC-13 (FR-13) | `/en/auth/signin?classroom_code=<code>` | same | PUBLIC | A new 6-character code opens the name step. An old 8-character code shows the note. |

Track-level gates:

- AC-14. `pnpm --filter primary-advantage test` and `pnpm --filter @reading-advantage/domain test`
  pass. tsc and ESLint pass on the changed packages (run one at a time).
- AC-15. The owner accepts the design captures (Phase 1) and the side-by-side report.

## Out of Scope

- The teacher picker of the class dialog (ADM-03, `primary_parity_school_management_20261011`).
- A staff preview of the student pages (STU-01, `primary_parity_staff_student_view_20261011`).
- Word alignment and click-to-seek (STU-10, `primary_parity_read_along_20261011`; it also changes
  `article-content.tsx`).
- Lesson "Start again" (STU-05, `primary_parity_lesson_repeat_20261011`).
- The new public pages (PUB-01, `primary_public_pages_20261007`).
- A session check for `/api/articles/[articleId]` GET (E-8). Found here; it needs its own fix.
- The level rule of `calculateLevelAndCefrLevel` (`lib/utils.ts:51-60`). It picks the level from the
  XP of one award, not from the total, in both apps. Found here; it needs an owner decision.
- Game XP into `users.xp` for Reading Advantage and Advantage Games (E-7).
- A move of `finishQuiz` or the student-list reads into `packages/domain`.
