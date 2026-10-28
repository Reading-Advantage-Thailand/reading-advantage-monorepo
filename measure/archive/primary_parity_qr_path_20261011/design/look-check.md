# Look check: Phase D design

Status: look check pending (owner, async)

The captures are listed in `captures.md`. The owner answers:

1. Is the library scene with the quest-giver and one parchment panel the right look for a page that a reader meets after a QR scan?
2. Is "school first (gold), Tutor second (wood)" the right order at 375 px?
3. Are the case texts clear for a child (not ready, not in the book) and for a teacher (no class)?

## Member Questions (defaults used, no owner answer yet)

Each default is the default of the spec. Look check pending (owner, async).

1. Tutor link: setting `TUTOR_LESSON_URL_TEMPLATE`; choice 2 shows only when the setting exists (mock `landing-school-only`).
2. Reading code target for a student: the lesson flow; the writing code opens the article page.
3. Landing: always show the two choices, school first, no cookie.
4. Lesson not ready (student): "This lesson is not ready yet. Ask your teacher." (heading plus text in the mock).

Answer: none yet. Later phases build from this design. A change request comes back to this file.
