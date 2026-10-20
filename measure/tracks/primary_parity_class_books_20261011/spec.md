# Spec: Class books ready at the cutover

Track ID: `primary_parity_class_books_20261011`
Type: feature (story-shaped spec)
Triage rows: TCH-01, TCH-02 (owner choice "extend", timing "before", 2026-10-11)

## Overview

The class book feature of track `primary_teacher_books_lesson_support_20261003` is in the build.
On the cutover database it does not work, because the book catalogue and the teacher guide are
empty. Only two command-line tools fill them, and no ETL step, runbook step, or go/no-go check runs
these tools. With an empty catalogue the class page hides the assign form, every printed
`/b/<book>/<n>` QR link gives "not found", and no step of the Teacher Manual works. Also, the book
card is at the bottom of the class page, and the dashboard book slot is a placeholder.

This track loads the catalogue and the guide after the ETL, adds a browser check for them, and
makes the class book easy to find. It changes no ETL code. It adds a catalogue build (a new Cloud
Build config next to the ETL config), a runbook step, and a go/no-go item, which
`primary_parity_rehearsal3_20261011` collects.

**Sprint goal:** On the rehearsal 3 database, a teacher assigns a book, finds it on the class page
and the dashboard, and completes each Teacher Manual step.

## Track Set

This track is member 3 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Verified Facts (2026-10-11, integration `ca8869cea`)

- The class page `app/[locale]/teacher/class-roster/[classroomId]/page.tsx:47-56` passes
  `ClassBooksCard` to `EnhancedClassRoster`. `components/teacher/enhanced-class-roster.tsx:260-308`
  shows the class heading (line 263), then `ClassLoginPanel` with the sign-in panel and the full
  roster (line 297), then the book card (line 307), then the quest card (line 308). `classroom-navigation.tsx:53-67` has no link to the book.
- `components/teacher/assign-book-form.tsx:28` returns only the text `noCatalogue` ("No books are
  in the catalogue yet.") when the catalogue is empty. The text gives no next action.
- `loadClassBooks` in the class page (`page.tsx:15-24`) drops every error. The page then shows
  the placeholder text `hint` ("The book and the lesson plan for this class will show here."),
  which is not true after a failure.
- `components/teacher/class-book-slot.tsx:17-29` is a static placeholder. The dashboard
  (`app/[locale]/teacher/dashboard/page.tsx:109`) renders it with no data.
- `packages/domain/scripts/import-lesson-packages.ts` and `import-lesson-guides.ts` are the only
  writers of `primary_books`, `primary_book_lessons`, and `primary_lesson_guides`
  (`packages/db/src/schema/primary-books.ts`). They are `pnpm` scripts of
  `@reading-advantage/domain` (`package.json:172-173`). They import `@reading-advantage/db`, which
  exports `dist/` only, so the build of `@reading-advantage/db` must run first.
- `apps/primary-advantage/cloudbuild-etl.yaml` runs guard, migrate, doctor, ETL, Tutor read check,
  and student sample. It has no import step. The command sheet
  `measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md` (R1 to R9,
  C1 to C14) and the go/no-go list (`docs/deployment/primary-cutover-migration-spec.md` §10) have no
  class book step. The go/no-go browser script (`.qa-tmp/rehearsal1-gonogo.mjs`, untracked, in the
  main checkout) has no class book check.
- The books track planned the step: "On the cutover database, the ETL fills the map and the same
  command links them" (`measure/tracks/primary_teacher_books_lesson_support_20261003/plan.md:15`).
- The importer links a lesson to its migrated article through `primary_legacy_id_map`, which the
  ETL fills (`packages/domain/src/primary-books/import.ts:73-82`). So the import must run after
  the ETL. A linked legacy article is never changed (Tutor reads it).
- Workbooks (`~/Desktop/Workbooks`, public repo `bodangren/advantage-workbooks`, head `eeeddfd`)
  holds the packages in `content/primary/<book>/*.json`. The five books of `BOOKS`
  (`packages/domain/src/primary-books/mapping.ts:9-15`: `o1`, `o2`, `o3-1`, `o3-2`, `q4`) are the
  folders `origins-1`, `origins-2`, `origins-3.1`, `origins-3.2`, and `quest-4`. They hold 70
  packages, about 2.2 MB of JSON. Each package is approved and names a legacy article. The folders also hold media
  (270 MB to 417 MB each), which the import does not read. The other folders (`quest-5`,
  `quest-6.*`, `adventure-*`) are drafts with book keys that `BOOKS` does not know; the importer
  refuses them ("unknown book key").
- The guide import reads `dashboard/lib/teacher-manual/i18n/{en,th}.ts` and
  `Teacher guide/step-N.md`, `step-N-th.md` from the Workbooks folder (`import-lesson-guides.ts:10-11`).
- The printed QR codes of Origins 3.2, Quest 4, and the insert print
  `https://primary.reading-advantage.com/b/<book>/<n>` (Workbooks
  `docs/content-plans/primary-origins-3.2-plan.md` D1, decided 2026-10-01; the route must be live
  by 2026-11-10). `app/[locale]/b/[book]/[n]/page.tsx:18-19` calls `notFound()` when the
  catalogue has no lesson.
- `isAppStepUnlocked` is in `packages/domain/src/primary-books/step-map.ts:63`;
  `class-books.ts:317` calls it.

## Stories

### Story S1: Load the catalogue and the guide after the ETL
**As a** cutover operator (agent)
**I want** one Cloud Build run next to the database that imports the five printed books and the teacher guide after the ETL
**So that** the new database has the catalogue, the lessons link to the migrated articles, and the guide shows in every lesson

**Acceptance Criteria:**
- Given a Workbooks archive of one Workbooks commit, When the operator makes it, Then it holds the JSON files of the five book folders, the manual `i18n` folder, and the `Teacher guide/step-*.md` files.
- Given the archive and a target after the ETL build, When the operator runs the catalogue build, Then the build builds `@reading-advantage/db`, runs `import-lesson-packages` on the five folders, and runs `import-lesson-guides --workbooks` on the archive.
- Given the catalogue build on a rehearsal copy, When it ends, Then the log shows "70 lessons", 0 failed, and the linked and unmapped counts.
- Given the same build, When the guide import ends, Then the log shows 13 steps for `en` and 13 steps for `th`.
- Given a package that fails to parse or import, When the build runs, Then the build fails and names the package.
- Given a second run after a fix, When the build ends, Then the rows are the same as after one run (the import is idempotent).
- Given the build log, When the operator reads it, Then it holds no password, no person name, and no database URL.
- Given the new command sheet of `primary_parity_rehearsal3_20261011`, When that member writes it, Then it has the new step text of this track (after the ETL, before the deploy) and the new §10 item.

**Estimate:** M
**Priority:** Must

### Story S2: Check the class book in the browser
**As a** cutover operator
**I want** the go/no-go browser check to assign a book and open a lesson with the demo teacher
**So that** a rehearsal or the cutover stops when the class book does not work

**Acceptance Criteria:**
- Given the demo teacher and the demo class on the tag URL, When the check opens the class page, Then the book card is above the sign-in panel.
- Given the class page, When the check assigns Primary Advantage Origins 3.2 in teacher-led mode, Then the page shows "Book assigned.".
- Given the assigned book, When the check opens lesson 1 of the lesson plan, Then the page shows the lesson title, the 13 guide steps, the projector link, and the answer key.
- Given lesson 1, When the page loads, Then the text "This lesson is not linked to an article yet." does not show.
- Given lesson 1, When the check opens the projector, Then the article text of the migrated article shows.
- Given a signed-in student of the demo class, When the check opens `/en/b/o3-2/1`, Then the student lands in the lesson flow of the linked article, not on "not found".
- Given any of these checks fails, When the script ends, Then it reports the failed check by name and the run counts as a stop.

**Estimate:** S
**Priority:** Must

### Story S3: Tell the teacher what to do when the catalogue is empty
**As a** teacher
**I want** the book card to say what to do when no book is in the catalogue or when the books do not load
**So that** I do not wait for a form that never comes

**Acceptance Criteria:**
- Given an empty catalogue, When a teacher opens the class page, Then the book card says that the book list is not ready and names the next action (default text in Member Questions).
- Given a failure of `listClassBooks` or `listCatalogueBooks`, When the class page loads, Then the book card shows a load error with a retry link, not the placeholder text.
- Given the same failure, When the server handles it, Then it logs one `class_books.load_failed` line through `lib/observability/logger.ts`.
- Given a catalogue and no assigned book, When the teacher opens the class page, Then the card says that no book is assigned and points to the assign form.
- Given each of the five locale files (`en`, `th`, `cn`, `tw`, `vi`), When the key-parity test runs, Then every new key is in every file.

**Estimate:** S
**Priority:** Must

### Story S4: Put the book card at the top of the class page
**As a** teacher
**I want** the class book card first on the class page, with a link to it in the class navigation
**So that** I find today's lesson without a scroll past the sign-in panel and the roster

**Acceptance Criteria:**
- Given a class with an assigned book, When the teacher opens the class page at 375 px and at 1280 px, Then the book card is the first card after the class heading, above the sign-in panel.
- Given the card, When the teacher reads it, Then it shows the book name, "Lesson N of M", the lesson title, the next workbook step, and links to the lesson plan and to the lesson page.
- Given the class navigation, When the teacher clicks the class book link, Then the page moves to the book card (anchor `#class-book`).
- Given the dashboard "Start class" link (`#class-login`), When the teacher clicks it, Then the page still moves to the sign-in panel.

**Estimate:** S
**Priority:** Must

### Story S5: Show the assigned book and the next lesson on the dashboard
**As a** teacher
**I want** the dashboard book slot to show each of my classes with its book, its current lesson, and the next step
**So that** I start the next lesson from the dashboard in one click

**Acceptance Criteria:**
- Given a teacher with two classes and one class book each, When the teacher opens the dashboard, Then the slot shows one row for each class book.
- Given a row, When the teacher reads it, Then it shows the class name, the book name, "Lesson N of M", the lesson title, and the next workbook step with its period.
- Given a row, When the teacher clicks it, Then the lesson page of that class book and lesson opens.
- Given a class with no book, When the dashboard loads, Then the row for that class links to the class page book card with the text "Assign a book".
- Given a teacher with no class book in any class, When the dashboard loads, Then the slot shows one short empty text and a link to the class list.
- Given a teacher of school A, When the slot loads, Then it shows only class books of classes that the teacher teaches (owner or co-teacher) in school A.

**Estimate:** M
**Priority:** Must

### Story S6: Check every Teacher Manual claim
**As a** teacher
**I want** each step of the Teacher Manual to work as the manual says
**So that** a first-time teacher can follow it without help

**Acceptance Criteria:**
- Given the rehearsal copy after S1, When the agent follows `TeacherUi.classBook.manual.howTo1` to `howTo5` with the demo teacher, Then each step works as the list below says.
  - howTo1: the teacher assigns the book on the class page.
  - howTo2: the teacher marks a workbook step, and the matching student step opens for a demo student.
  - howTo3: the lesson guide shows the teacher actions, the teacher language, and the full script.
  - howTo4: the projector shows the reading and the answer reveal.
  - howTo5: the progress grid shows the student, and "Mark taught" moves the pointer.
- Given `/teacher/manual`, When it loads, Then "The 13 steps" section shows the imported guide, not "The teacher guide is not imported yet.".
- Given a claim that does not match the app after S1 to S5, When the check finds it, Then this track changes the manual text in all five locale files.
- Given a changed manual text, When the change is ready, Then the owner checks the English and the Thai text.
- Given the check, When it ends, Then the result list (claim, account, page, pass or fail, capture) goes into the track folder for the acceptance kit.

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

- The teacher pages use the RPG skin kit (`components/rpg/*`: `Panel`, `Plaque`, `RpgLink`,
  `RpgButton`, the `cq-` tokens) inside the teacher shell. Buttons are 48 px or more. The pages
  work at 375 px and 1280 px, day and night (`docs/primary-rpg-skin.md` rules 2, 7, 8).
- New domain reads have Zod output contracts in
  `packages/domain/src/primary-books/class-book-contracts.ts`, `assertCan` checks, and TenantDB
  scoping by `schoolId` (the existing `UNSCOPED_REASON` pattern of `class-books.ts`).
- New Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`.
- No schema change and no migration.
- The Workbooks archive holds public content only. The ETL inputs that name people stay in Secret
  Manager.

## Acceptance Criteria (track level)

The side-by-side kit of `primary_parity_acceptance_20261011` checks these on a rehearsal copy:

| Check | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| A1 | none (a new feature) | `/teacher/class-roster/<demo class>` | TEACHER (demo teacher) | The book card is first. The assign form lists the five books. |
| A2 | none | `/teacher/class-roster/<class>/books/<classBook>/lessons/1` | TEACHER | Guide, projector link, and answer key show. No "not linked" text. |
| A3 | none | `/teacher/dashboard` | TEACHER | The slot shows the class book, "Lesson 1 of 14", and the next step. |
| A4 | printed Origins 2 QR (`/student/read/<cuid>`) | `/b/o3-2/1` | STUDENT (demo class) | The lesson flow of the linked article opens. |
| A5 | none | `/teacher/manual` | TEACHER | The five how-to steps pass (S6). The 13 steps show the guide. |

- Domain tests (Vitest, `packages/domain`) and app tests (Vitest, `apps/primary-advantage`) pass.
- The owner's look check passes on captures at 375 px and 1280 px, day and night.

## Out of Scope

- Books that `BOOKS` does not know (Quest 5, Quest 6, Adventure 7 to 9). They wait for the
  Workbooks approval and a later change of `BOOKS`.
- An automatic catalogue sync after the cutover. A later catalogue update reruns the catalogue
  build by hand.
- The ETL code (`packages/db/src/migrations-data/primary-legacy-import.ts`): no change.
- The Workbooks injector (CNT-01) and the mastery tags backfill (runbook §9 step 11).
- Lesson repeat (`primary_parity_lesson_repeat_20261011`), print a lesson
  (`primary_parity_print_lesson_20261011`), games in the lesson
  (`primary_parity_lesson_games_20261011`).
- The other parts of the teacher dashboard (TCH-03, `primary_parity_teacher_home_20261011`).

## Member Questions (owner)

1. Text for an empty catalogue. Default: "The book list is not ready yet. Tell your school admin,
   who asks Reading Advantage to load the books." Does the owner want a LINE link or another
   contact in the text?
2. Catalogue at the cutover. Default: the five printed books of `BOOKS` (Origins 1, Origins 2,
   Origins 3.1, Origins 3.2, Quest 4). Is Origins 1 in use at schools, or must it stay out of
   the assign list?
3. The browser check assigns Origins 3.2 to the demo class on production. Default: yes, and the
   check leaves the assignment in place for the demo. Does the owner accept this write?
