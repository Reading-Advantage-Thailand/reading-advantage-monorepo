# Teacher Manual claim check (Story S6)

Date: 2026-10-12. Code base: lane B, phase start `9af86b116`. Method: a code check now (this file),
a browser run later (the batch of the orchestrator). The text keys are
`TeacherUi.classBook.manual.*` in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`.
Account for all claims: the demo teacher (`TEACHER`) and one demo student (`STUDENT`, student 1 of the demo class).
Paths below are under `apps/primary-advantage/` unless they start with `packages/`.

## Claim list

| Claim | Text (en) | Page | Account | Expected result |
| --- | --- | --- | --- | --- |
| howTo1 | Assign the book to your class on the class page. | `/teacher/class-roster/<class>` | TEACHER | The form shows the book list. "Assign" shows "Book assigned.". The card lists the book. |
| howTo2 | Open the lesson plan and mark each workbook step as the class does it. The app opens the matching student step. | `/teacher/class-roster/<class>/books/<classBook>`; student: `/student/books/<classBook>` | TEACHER, STUDENT | A step toggle changes to pressed. The student gets the "Read" link and opens `/student/lesson/<article>`. |
| howTo3 | Open the lesson guide for the teacher actions, the teacher language, and the full script. | `.../books/<classBook>/lessons/1` | TEACHER | The page shows the headings "Teacher actions" and "Teacher language" and a "Full script" disclosure. |
| howTo4 | Use the projector view for whole-class reading and the answer reveal. | `.../lessons/1/projector` | TEACHER | The article shows; "Next" focuses paragraph 1; "Show answer" reveals an answer. |
| howTo5 | Check the class progress grid after the lesson and mark the lesson taught. | `.../books/<classBook>/progress` and `.../books/<classBook>` | TEACHER | The grid has a row for the student. "Mark taught" moves "Lesson 1 of 14" to "Lesson 2 of 14". |
| 13 steps | The 13 steps | `/teacher/manual` | TEACHER | 13 guide steps show. "The teacher guide is not imported yet." does not show. |

## Code check

| Claim | Judgement | Evidence (`file:line`) |
| --- | --- | --- |
| howTo1 | holds; browser run adds proof | The card has the anchor `#class-book` and the assign form: `components/teacher/class-books-card.tsx:27,98-105`. The form calls the action `assignClassBookAction`: `components/teacher/assign-book-form.tsx:6,24`. The domain function assigns with an upsert: `packages/domain/src/primary-books/class-books.ts:143-152`. S2 checks the same flow: `scripts/primary-parity/cutover-check.mjs` (class book block). |
| howTo2 | holds in code, with one note; needs the browser | The plan page shows the 13 toggles for the current lesson: `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/page.tsx:92`; `components/teacher/class-book-pacing-controls.tsx:66-97`. A toggle stores the step: `packages/domain/src/primary-books/class-books.ts:304-327`. The student read model unlocks app steps from the steps done, in teacher-led mode only: `class-books.ts:406`; the lock is `packages/domain/src/primary-books/step-map.ts:63-66`. The student lesson page passes the last open step to the lesson: `app/[locale]/(student)/student/lesson/[id]/page.tsx:33-40,69-80`. The lesson blocks later steps: `components/lesson/lesson-progress-bar.tsx:283-286`. Note: the student gets the "Read" link only when step 3 is open: `app/[locale]/(student)/student/books/[classBookId]/page.tsx:51-54` and `app/[locale]/(student)/student/home/page.tsx:252`. After the teacher marks only step 1 or 2, the student has no link (a printed QR link still opens the lesson with the lock). The text "opens the matching student step" holds for the lesson flow from step 3. No text change (Low finding in `plan-review.md`). |
| howTo3 | holds; needs the browser for the script text | The lesson page renders the guide: `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/page.tsx:105-111`. The lists "Teacher actions" and "Teacher language" and the "Full script" disclosure are in `components/teacher/guide-steps.tsx:76-86`. The data is `getLessonGuide` (en or th, 13 rows with `scriptMd`): `packages/domain/src/primary-books/guides.ts:60-84`. The script is closed by default (a disclosure); the text says "full script" and the label is "Full script". |
| howTo4 | holds; needs the browser | The projector page loads the lesson: `.../lessons/[number]/projector/page.tsx:27-44`. The reading with the paragraph focus: `components/teacher/projector-view.tsx:30-64`. The answer reveal button: `projector-view.tsx:118-119`. The reveal shows only when the lesson has a question bank (`projector-view.tsx` shows the questions section when `bank.mcq` or `bank.saq` has rows). |
| howTo5 | holds; needs the browser | The plan page links to the grid ("Class progress"): `books/[classBookId]/page.tsx:69-74`. The grid lists all students of the class, with or without steps: `.../progress/page.tsx:117-150` and `packages/domain/src/primary-books/progress.ts:181-196`. "Mark taught" moves the pointer when the lesson is the current one and is not the last: `packages/domain/src/primary-books/class-books.ts:282-300`; the button is in `class-book-pacing-controls.tsx:49-53`. The button is on the plan page, not on the grid. The text names both actions but not the page of each. |
| 13 steps | holds when the catalogue build ran; needs the browser | The manual page reads `getLessonGuide({ db, locale })` and shows `guide.empty` ("The teacher guide is not imported yet.") when the read fails or is empty: `app/[locale]/teacher/manual/page.tsx:25,38-42`. The catalogue build fills `primary_lesson_guides` (S1; log "en: 13 steps", "th: 13 steps"): `measure/tracks/primary_parity_class_books_20261011/catalogue-run.md`. The page test covers the empty and full cases: `app/[locale]/teacher/manual/__tests__/page.test.tsx:51-67`. |

Result of the code check: no claim fails. No manual text changed in the five locale files, so no new
test for the manual page. One Low finding (howTo2 note) and one Low finding (howTo5 page names) go to `plan-review.md`.

## Browser run (batch, orchestrator)

The checks are in `scripts/primary-parity/cutover-check.mjs` (block "Teacher Manual claims (spec S6)").
Pure judges: `scripts/primary-parity/class-book-checks.mjs`. Steps: `browser-check/README.md`.
Result list columns for the acceptance kit: claim, account, page, pass or fail, capture.

| Check name | Claim | Account | Page | Result | Capture |
| --- | --- | --- | --- | --- | --- |
| manual: the how-to list has 5 steps | howTo list | TEACHER | `/teacher/manual` | not run | `teacher-manual.png` |
| manual: The 13 steps shows the imported guide | 13 steps | TEACHER | `/teacher/manual` | not run | `teacher-manual.png` |
| class book: the page shows "Book assigned." (S2) | howTo1 | TEACHER | class page | not run | `teacher-class-book-card.png` |
| manual howTo2: the student step stays closed before the teacher marks it | howTo2 | STUDENT | `/student/books/<classBook>` | not run | none |
| manual howTo2: the student step opens after the teacher marks it | howTo2 | TEACHER, STUDENT | plan, student book, lesson | not run | `teacher-manual-howto2-plan.png`, `student1-manual-howto2-lesson.png` |
| manual howTo3: the guide shows the teacher actions | howTo3 | TEACHER | lesson 1 | not run | `teacher-class-book-lesson1.png` |
| manual howTo3: the guide shows the teacher language | howTo3 | TEACHER | lesson 1 | not run | same |
| manual howTo3: the guide shows the full script | howTo3 | TEACHER | lesson 1 | not run | same |
| manual howTo4: the projector focuses one paragraph | howTo4 | TEACHER | projector | not run | `teacher-manual-howto4-projector.png` |
| manual howTo4: the projector reveals an answer | howTo4 | TEACHER | projector | not run | same |
| manual howTo5: the progress grid shows the student | howTo5 | TEACHER | progress | not run | `teacher-manual-howto5-progress.png` |
| manual howTo5: Mark taught moves the pointer | howTo5 | TEACHER | plan | not run | `teacher-manual-howto5-taught.png` |
