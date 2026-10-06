# Spec — Class Books and Teacher Lesson Support

Track ID: `primary_teacher_books_lesson_support_20261003`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)

## Context

Teachers cannot assign a book to a class. They assign single articles. Without a
class-book link the app cannot show a pacing position, per-lesson progress, or a
class grid. Printed books are 14 lessons, each with 13 fixed steps, taught over four
periods. Tutor Advantage gives tutors a per-phase guide, a rehearsal page, teaching
demos, and a live control surface. Primary teachers get the same level of support in
teacher-led mode. Students may also read alone (independent mode), where the book
is optional.

## Functional Requirements

### Books and classes
- FR-1: Teacher assigns one or more books to a class (for example Primary Advantage
  Origins 3.2). The assignment stores start date and the current lesson pointer.
  Book names always carry the product name.
- FR-2: Book catalogue in the database: series, book, 14 lessons mapped to articles,
  questions, vocabulary, flashcard sentences, media, and audio. Import the printed and
  next-to-print books first (Primary Advantage Origins 2, Origins 3.1, Origins 3.2, Quest 4).
  The import is idempotent and additive. It must not alter existing article rows that
  Tutor reads. Insert new articles or link existing ones.
- FR-3: Teacher marks a lesson "taught" and moves the pointer. Pacing view shows the
  planned period (1-4) and the next step.
- FR-4: Assigned lessons appear on the student home and in the student's book view.
  Independent readers keep free reading; a student can also read ahead.

### Progress
- FR-5: Per student, per lesson, per step: not started, in progress, done, with time.
  Reuse `articleActivityLogs` for app activity; add a class-book lesson progress table.
- FR-6: Class grid (students by lessons) with a status color and a click-through
  to one student. Filters: late, stuck, not started. CSV export.
- FR-7: Workbook-fidelity signals the teacher can see: lesson opened before the app
  activities, writing submitted after the draft step. Use timestamps only. No new
  student-facing claims.

### Lesson support (teacher-led mode)
- FR-8: Teacher guide per lesson: the 13 steps grouped into the four periods, with
  teacher actions, teacher language, student actions, and watch-fors. The UI language
  switcher selects the language: Thai when the locale is Thai, English for every other
  locale. The same rule applies to the guide overlay and the lesson tracker. Content
  comes from `~/Desktop/Workbooks` (`dashboard/lib/teacher-manual/i18n/en.ts` and
  `th.ts`, and the `Teacher guide` folder, which has `step-N.md` and `step-N-th.md`).
  Do not rewrite the scripts. Import them.
- FR-9: Guide overlay for the live lesson, one step at a time, with a tip (port
  `TutorGuidePlan` and `TutorGuideOverlay` ideas; strip tutor and payment concepts).
- FR-10: Lesson rehearsal page: the teacher sees the student view of each step.
- FR-11: Projector mode: article display with paragraph focus, vocabulary list,
  question reveal with per-option tallies where the class used the app, and the answer key.
- FR-12: Answer keys per lesson (matching, fill-in, sentence order, completion, short
  answer model answers, writing rubric) visible to teachers only.
- FR-13: Bell-ringer and practice phases link to the existing games. Teacher picks a
  game per period. Teaching demos (port the seven `*TeachingGame` demos that exist in
  Tutor, game by game, as the games already exist in `game-cartridges`).
- FR-14: Pair-conversation, reflection, and wrap-up steps as teacher prompts plus a
  student screen where the step has a digital part.
- FR-15: In-app teacher manual page and a short how-to for first-time teachers.
  Printable aids (lesson plan, answer key) are an extra: P2 priority.
- FR-16: QR deep links from the printed book to the lesson. The pattern is confirmed in
  `Workbooks/content/primary/README.md`: `https://primary.reading-advantage.com/b/<book>/<n>`
  (for example `o3-2/5`). Primary must serve `/b/<book>/<n>` and route to the lesson.

## Rules

- The workbook comes first. For TL mode the app does not unlock the full question
  bank, the games, or AI feedback before the matching workbook step is marked done by
  the teacher for the class. IND mode has no such lock.
- Teacher-mediated AI only for the language-questions step. No direct student AI chat there.

## Schema (additive only)

New tables with a `primary_` prefix: class book, class book lesson state, student
lesson step progress, and any book/lesson catalogue tables that do not exist. Do not
change the Tutor-read tables.

## Non-goals

- The live socket control layer (phase sync to student devices). Later track.
- Pre and post assessment. Later track.

## Acceptance Criteria

- Teacher assigns Primary Advantage Origins 3.2 to a class and sees its 14 lessons.
- A student completes lesson 1 steps and the class grid updates within one minute.
- Each of the 13 steps has guidance in Thai (Thai locale) and English (other locales), checked against the Workbooks source.
- Tutor read test still passes after the import.
