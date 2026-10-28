# Design: the /b/<book>/<n> pages

Track: `primary_parity_qr_path_20261011`. Phase D. The mock source is `mock-source.tsx.txt`.
It uses the real `Panel`, `Sign`, `Bubble`, `Sprite`, `RpgLink`, and `Scene` and the real `rpg.css`.
The `.txt` suffix keeps it out of tsc and eslint. The app code does not change in this phase.
Phase S4 ports the case markup to `components/book-link/*`. Phase S2 ports the landing.

## Frame (all states)

- Scene place: `library` (the book place of the skin). Phone and desktop backdrops exist.
- Top line on the scene: the product name (left) and the language menu (right), as `auth/layout.tsx` does.
- One parchment `Panel`, `max-w-md`, centred. The page has no other object.
- Panel top row: the quest-giver NPC (`Sprite`, idle strip, 72 px) and a `Bubble` with one short word.
- Then the content column. One gold button per screen at most; iron for a way out.
- Ink on parchment in day and night (the panel resets the theme tokens).

## Landing (signed out) - spec S2

Order: `Sign` with the book name, heading "Lesson N: title", the question "Which app do you use?",
then two stacked `RpgLink` choices (two lines each: title and hint, 64 px or more).

| State | Key | Content |
| --- | --- | --- |
| Landing | `landing` | Gold choice 1 "My school uses Primary Advantage" (to sign-in with the callback of S1), wood choice 2 "I study with Tutor Advantage" (Tutor URL) |
| No Tutor setting | `landing-school-only` | Choice 1 only. The question stays. |
| Writing code | `landing-writing` | Same as landing, bubble "Time to write!", small line "Writing task" under the heading |

The landing shows only the book name, the lesson title, and the choices (no private data).

## Case pages - spec S4 (signed in, or a bad link)

Each case: `h1` with `role="alert"` (the page is an error state), one or two sentences, one button.

| State | Key | Heading | Text | Button |
| --- | --- | --- | --- | --- |
| Unknown book | `unknown-book` | We do not know this book | The book in this link is not in Primary Advantage. Check the code on your page. | iron "Go to my home" (role home) |
| Number out of range | `no-lesson` | This lesson is not in the book | {book} has Lessons 1 to {count}. Check the number on your page. | iron "Go to my home" |
| Lesson not ready (student) | `not-ready` | This lesson is not ready yet | Ask your teacher. (Member Question 4 default) | iron "Go to my home" (student home) |
| No class for the book (teacher) | `no-class` | No class uses this book | {book} is not assigned to any of your classes. Open a class, then assign the book on the class page. | gold "Go to my classes" |
| Class teacher only (SYSTEM, ADMIN with no school class) | `teacher-only` | This link is for a class teacher | Sign in as a teacher of a class to open this lesson. | iron "Go to my home" |
| Wrong account (INTERN and others) | `wrong-account` | This link is not for this account | Sign in with a student or teacher account to open this lesson. | iron "Go to my home" |
| Unknown address (`/b/o3-2/5/other`) | `unknown-address` | We do not know this address | Scan the code on your page again. If it still fails, ask your teacher. | iron "Go to the start page" |
| Lookup error (retry) | `retry` | We could not open the lesson | Check the internet connection and try again. | gold "Try again" (same URL) |

A number that is not a whole number of 1 or more uses the `no-lesson` page when the book is known,
else `unknown-book`. The "Go to my home" target is the role home: student home, teacher class
list, or `/` for other roles. Bubble words: "Oh no!" (default), "Not yet!" (not ready), "Oops!" (retry).

## Behavior notes for S2 and S4

- The page is a server component. The button targets are plain links (no client JS).
- A signed-in reader never sees the landing (spec S2).
- Buttons are `RpgLink` (48 px minimum). The harness checks pass: no button under 48 px and no
  horizontal scroll in all 44 captures.
- Proposed key names under a new `BookLink` namespace (English; five locale files in S4 and S2):
  `bubbleRead`, `bubbleWrite`, `bubbleOops`, `bubbleNotYet`, `landingQuestion`, `lessonLine`
  ("Lesson {number}: {title}"), `writingTask`, `choiceSchool`, `choiceSchoolHint`, `choiceTutor`,
  `choiceTutorHint`, `unknownBookTitle`/`Body`, `noLessonTitle`/`Body` ({book}, {count}),
  `notReadyTitle`/`Body`, `noClassTitle`/`Body`, `teacherOnlyTitle`/`Body`, `wrongAccountTitle`/`Body`,
  `unknownAddressTitle`/`Body`, `retryTitle`/`Body`, `toHome`, `toClasses`, `toStart`, `retry`.
  Thai text comes from the owner (look check pending).
