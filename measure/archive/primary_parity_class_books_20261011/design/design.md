# Design: class book card, class navigation link, dashboard slot

Track: `primary_parity_class_books_20261011`. Phase D. The mock source is `mock-source.tsx.txt`.
It uses the real `Panel`, `Plaque`, `Meter`, `RpgLink`, and `RpgButton` and the real `rpg.css`.
The `.txt` suffix keeps it out of tsc and eslint. The app code does not change in this phase.

## Frame

The teacher pages keep the staff shell (plain background, staff header, sidebar). The book card
and the slot are the only RPG elements: one parchment `Panel` each. The page behind stays the
staff page, so the card stands out as the main object of the page. Ink on parchment in day and
night (the panel resets the theme tokens). All buttons are `RpgLink` or `RpgButton`: 48 px.

## Class page (order top to bottom)

1. Class heading (unchanged) with a new first action link "Class book" (anchor `#class-book`).
   It keeps the staff outline button style (44 px) like its four neighbours.
2. The book card: `Panel` with `id="class-book"` and `scroll-mt-20`. First card after the heading.
3. The sign-in panel (`#class-login`) and the roster (unchanged).
4. The quest card (unchanged).

## Book card states

| State | Capture key | Content |
| --- | --- | --- |
| Assigned | `class-assigned` | Title row, "Now in class", book name, two `Plaque` (lesson N/M, lessons taught), lesson title, thin green `Meter` of the 13 workbook steps, "Next step - Step N: title - Period P", gold `RpgLink` "Open lesson" (lesson page), wood `RpgLink` "Lesson plan" (pacing page), a closed `details` "Assign another book" with the form |
| No book | `class-none` | Title row, one sentence, the assign form with a gold "Assign" button |
| Empty catalogue | `class-empty-catalogue` | Title row, dashed box with two sentences (Member Question 1 default text), no form |
| Load error | `class-load-error` | Title row, red alert icon, two sentences, iron `RpgLink` "Try again" to the same page |

Several class books: repeat the "Now in class" block for each book, newest assignment first.
Only the first block has the gold button; the others use wood (one gold action per screen).

## Proposed new keys under `TeacherUi.classBook` (English; S3 and S4 add them in five files)

- `navLink`: "Class book" (also `Teacher.ClassroomNavigation.nav.classBook`)
- `nowInClass`: "Now in class"
- `openLesson`: "Open lesson"
- `lessonTitle`: "Lesson {number}: {title}" (the key `lesson` exists as an object; use a new name)
- `taughtLabel`: "Lessons taught"
- `stepsMeter`: "Workbook steps done"
- `assignAnother`: "Assign another book"
- `noneAssigned`: "No book is assigned to this class yet. Choose a book below to start."
- `emptyCatalogueTitle`: "The book list is not ready yet."
- `emptyCatalogueBody`: "Tell your school admin, who asks Reading Advantage to load the books."
- `loadErrorTitle`: "We could not load the class books."
- `loadErrorBody`: "Check the internet connection and try again."
- `retry`: "Try again"
- `slotTitle`: "Class books"; `slotEmpty`: "No class has a book yet. Open a class to assign one."
- `slotError`: "We could not load the class books. Reload the page to try again."
- `assignRow`: "Assign a book"; `slotNext`: "Next"; `goToClasses`: "Go to my classes"

The empty-catalogue text is the spec default. The `noCatalogue` key keeps its key name; its text changes.

## Dashboard slot

One `Panel` in the grid of `app/[locale]/teacher/dashboard/page.tsx`, in the same grid cell as today
(`lg:col-span-2`, after the classes card and before the quest cards).

| State | Capture key | Content |
| --- | --- | --- |
| Rows | `dash-rows` | One row link per class: class name, "Book - Lesson N of M", lesson title, "Next - Step N: title - Period P". A class with no book shows "Assign a book" (links to `/teacher/class-roster/<id>#class-book`). Whole row is the link; row 72 px minimum; chevron at the end |
| Empty | `dash-empty` | One sentence and a gold `RpgLink` "Go to my classes" |
| Error | `dash-error` | Red alert icon and one sentence (the page logs the failure) |

### Slot size for the teacher home track (`primary_parity_teacher_home_20261011`)

- Width: the full grid width, 2 of 2 columns from 1024 px (`lg:col-span-2`); one column below.
- Height at 1280 px, measured in the capture: header 40 px, each row about 116 px (3 text lines)
  or 72 px (the "Assign a book" row), gaps 8 px, padding 18 px. Three rows (2 books and 1 empty)
  are about 400 px. Empty slot about 150 px. Error slot about 110 px.
- Height at 375 px: each row grows by one text line when the lesson title wraps (about 130 px).
- The slot grows with the class count. Cap: show every class (teachers have few classes). If the
  teacher home track needs a cap, scroll inside the list; do not hide a class.
- Position: after the "My classes" card, before the per-class quest cards. Keep that order.
