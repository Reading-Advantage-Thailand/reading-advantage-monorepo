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
