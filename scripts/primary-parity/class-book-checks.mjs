// Pure helpers of the class book block of cutover-check.mjs (track primary_parity_class_books_20261011,
// Story S2). They hold no browser code, so a node test can run them. They never see a password or a name.

/** The book that the check assigns (key `o3-2`, QR link `/b/o3-2/1`). */
export const BOOK_LABEL = "Primary Advantage Origins 3.2";
export const BOOK_KEY = "o3-2";

/**
 * Reads the class book id from a lesson plan link.
 * @param href A link such as `/en/teacher/class-roster/<class>/books/<classBookId>`.
 * @returns The class book id, or an empty string when the link has no id.
 */
export function classBookIdFromHref(href) {
  return /\/books\/([^/?#]+)/.exec(href ?? "")?.[1] ?? "";
}

/**
 * Tells whether the book card comes before the sign-in panel.
 * @param bookTop The top edge of the book card, or null when the card is missing.
 * @param loginTop The top edge of the sign-in panel, or null when the panel is missing.
 * @returns True when both exist and the card is higher on the page.
 */
export function bookCardFirst(bookTop, loginTop) {
  return bookTop !== null && loginTop !== null && bookTop < loginTop;
}

/**
 * Judges the facts of the teacher lesson page for lesson 1.
 * @param f.title The page heading.
 * @param f.stepCount The number of guide steps on the page.
 * @param f.hasProjectorLink True when the projector link shows.
 * @param f.hasAnswerKey True when the answer key heading shows.
 * @param f.answerKeyEmpty True when the page says that the lesson has no answer key.
 * @param f.notLinked True when the page says that the lesson has no article.
 * @returns The checks, each with a name, a result, and a note.
 */
export function judgeLessonPage(f) {
  const afterDot = (f.title ?? "").split("·").slice(1).join("·").trim();
  return [
    { name: "class book: lesson 1 page shows the lesson title", ok: /^Lesson 1\b/.test(f.title ?? "") && afterDot.length > 0, note: "" },
    { name: "class book: lesson 1 page shows the 13 guide steps", ok: f.stepCount === 13, note: `${f.stepCount} steps` },
    { name: "class book: lesson 1 page has the projector link", ok: !!f.hasProjectorLink, note: "" },
    { name: "class book: lesson 1 page shows the answer key", ok: !!f.hasAnswerKey && !f.answerKeyEmpty, note: f.answerKeyEmpty ? "key is empty" : "" },
    { name: "class book: lesson 1 is linked to an article", ok: !f.notLinked, note: "" },
  ];
}

/**
 * Judges the facts of the projector page.
 * @param f.heading The page heading.
 * @param f.paragraphs The number of article paragraphs on the page.
 * @returns The check. The heading falls back to "Lesson 1 · ..." when the article is missing.
 */
export function judgeProjector(f) {
  const fromArticle = !!f.heading && !/^Lesson \d+\s·/.test(f.heading);
  return [{ name: "class book: projector shows the article text", ok: fromArticle && f.paragraphs > 0, note: `${f.paragraphs} paragraphs` }];
}

/**
 * Judges where a student lands after the QR link.
 * @param pathname The path after the redirects.
 * @param bodyText The page text.
 * @returns The check. The student must land in the lesson flow, not on "not found" or the home page.
 */
export function judgeStudentLanding(pathname, bodyText) {
  const inLesson = /\/student\/lesson\/[^/]+/.test(pathname ?? "");
  const notFound = /could not be found|not found|404/i.test(bodyText ?? "");
  return [{ name: `class book: student opens /b/${BOOK_KEY}/1 in the lesson flow`, ok: inLesson && !notFound, note: pathname ?? "" }];
}

// Story S6: the Teacher Manual claims (howTo1 to howTo5 and "The 13 steps"). Check names start with "manual".

/**
 * Judges the facts of `/teacher/manual` (claim "The 13 steps", howTo list).
 * @param f.howToItems The number of how-to list items.
 * @param f.stepItems The number of guide steps in the "The 13 steps" section.
 * @param f.notImported True when the page says that the guide is not imported.
 * @returns The checks.
 */
export function judgeManualPage(f) {
  return [
    { name: "manual: the how-to list has 5 steps", ok: f.howToItems === 5, note: `${f.howToItems} items` },
    { name: "manual: The 13 steps shows the imported guide", ok: !f.notImported && f.stepItems === 13, note: `${f.stepItems} steps${f.notImported ? ", not imported" : ""}` },
  ];
}

/**
 * Judges howTo2: the student sees no read link before the teacher marks steps, and a read link after.
 * @param f.readBefore True when the student book page had a read link for lesson 1 before the marks.
 * @param f.readAfter True when the link shows after the teacher marked steps 1 to 3.
 * @param f.landedPath The path after the student opened the link.
 * @returns The checks.
 */
export function judgeStudentUnlock(f) {
  return [
    { name: "manual howTo2: the student step stays closed before the teacher marks it", ok: f.readBefore === false, note: "" },
    { name: "manual howTo2: the student step opens after the teacher marks it", ok: f.readAfter === true && /\/student\/lesson\/[^/]+/.test(f.landedPath ?? ""), note: f.landedPath ?? "" },
  ];
}

/**
 * Judges howTo3: the lesson guide lists the teacher actions, the teacher language, and the full script.
 * @param f.teacherActions The number of "Teacher actions" headings.
 * @param f.teacherLanguage The number of "Teacher language" headings.
 * @param f.scripts The number of "Full script" disclosures.
 * @returns The checks.
 */
export function judgeGuideContent(f) {
  return [
    { name: "manual howTo3: the guide shows the teacher actions", ok: f.teacherActions > 0, note: `${f.teacherActions}` },
    { name: "manual howTo3: the guide shows the teacher language", ok: f.teacherLanguage > 0, note: `${f.teacherLanguage}` },
    { name: "manual howTo3: the guide shows the full script", ok: f.scripts > 0, note: `${f.scripts}` },
  ];
}

/**
 * Judges howTo4: the projector focuses a paragraph and reveals an answer.
 * @param f.focusStatus The status text after the next-paragraph click.
 * @param f.revealButtons The number of answer buttons.
 * @param f.pressedAfter True when the first answer button shows pressed after the click.
 * @returns The checks.
 */
export function judgeProjectorUse(f) {
  return [
    { name: "manual howTo4: the projector focuses one paragraph", ok: /^Paragraph 1 of \d+/.test(f.focusStatus ?? ""), note: f.focusStatus ?? "" },
    { name: "manual howTo4: the projector reveals an answer", ok: f.revealButtons > 0 && !!f.pressedAfter, note: `${f.revealButtons} questions` },
  ];
}

/**
 * Reads the lesson number of a "Lesson N of M" text.
 * @param text The pointer text.
 * @returns The number, or 0 when the text does not match.
 */
export function pointerOf(text) {
  return Number(/Lesson (\d+) of \d+/.exec(text ?? "")?.[1] ?? 0);
}

/**
 * Judges howTo5: the grid shows the student and "Mark taught" moves the pointer.
 * @param f.studentRows The number of student rows in the progress grid.
 * @param f.before The pointer text before "Mark taught".
 * @param f.after The pointer text after it.
 * @param f.skipped True when lesson 1 was already taught (a rerun), so the click did not run.
 * @param f.resetPointer The pointer text after "Teach again" on lesson 1 (the reset that ends the block).
 * @param f.markTaughtBack True when lesson 1 shows "Mark taught" again after the reset.
 * @returns The checks.
 */
export function judgeProgressAndTaught(f) {
  const moved = pointerOf(f.after) === pointerOf(f.before) + 1 && pointerOf(f.before) > 0;
  return [
    { name: "manual howTo5: the progress grid shows the student", ok: f.studentRows > 0, note: `${f.studentRows} rows` },
    { name: "manual howTo5: Mark taught moves the pointer", ok: f.skipped ? true : moved, note: f.skipped ? "skipped, lesson 1 already taught" : `${f.before} -> ${f.after}` },
    {
      name: "manual howTo5: Teach again resets lesson 1 (a second run starts clean)",
      ok: pointerOf(f.resetPointer) === 1 && f.markTaughtBack === true,
      note: `${f.resetPointer ?? ""}; Mark taught back: ${f.markTaughtBack}`,
    },
  ];
}
