// Pure helpers of the QR path block of cutover-check.mjs (track primary_parity_qr_path_20261011,
// Story S6). They hold no browser code, so a node test can run them. They never see a password,
// a class code, or a name. Check names start with "qr".
import { BOOK_LABEL } from "./class-book-checks.mjs";

/** The `/b/` paths that the block opens (no locale prefix). */
export const QR_PATHS = {
  read: "/b/o3-2/1",
  writing: "/b/o3-2/1/writing",
  unknownBook: "/b/zz/1",
  noLesson: "/b/o3-2/999",
  unknownAddress: "/b/o3-2/5/other",
};

/**
 * Judges the signed-out landing of a `/b/` address.
 * @param label The check prefix, such as "qr read".
 * @param f.status The HTTP status of the page.
 * @param f.hasLanding True when the `[data-landing]` block shows.
 * @param f.text The landing text.
 * @param f.hasSchoolChoice True when the landing has a link to the sign-in page.
 * @param writing True for the writing address: the landing must show the writing task line.
 * @returns The checks, each with a name, a result, and a note.
 */
export function judgeLanding(label, f, writing = false) {
  const checks = [
    { name: `${label}: signed-out landing shows (status below 500)`, ok: f.status < 500 && !!f.hasLanding, note: `status ${f.status}` },
    { name: `${label}: landing names the book`, ok: (f.text ?? "").includes(BOOK_LABEL), note: "" },
    { name: `${label}: landing has the school choice`, ok: !!f.hasSchoolChoice, note: "" },
  ];
  if (writing) checks.push({ name: `${label}: landing shows the writing task`, ok: (f.text ?? "").includes("Writing task"), note: "" });
  return checks;
}

/**
 * Judges where a student lands after the class code sign-in that started on the landing.
 * @param pathname The path after the sign-in and the redirects.
 * @param bodyText The page text.
 * @returns The check. The student must end in the lesson flow, not on "not found" or the home page.
 */
export function judgeSignedInLesson(pathname, bodyText) {
  const inLesson = /\/student\/lesson\/[^/]+/.test(pathname ?? "");
  const notFound = /could not be found|not found|404/i.test(bodyText ?? "");
  return [{ name: "qr read: class code sign-in lands on the lesson flow", ok: inLesson && !notFound, note: pathname ?? "" }];
}

/**
 * Judges where a signed-in student lands after the writing code.
 * @param pathname The path after the redirects.
 * @param bodyText The page text.
 * @returns The check. The student must end on an article page.
 */
export function judgeWritingArticle(pathname, bodyText) {
  const onArticle = /\/student\/read\/[^/]+/.test(pathname ?? "");
  const notFound = /could not be found|not found|404/i.test(bodyText ?? "");
  return [{ name: "qr writing: writing code opens the article page", ok: onArticle && !notFound, note: pathname ?? "" }];
}

/**
 * Judges a case page (unknown book, no lesson, unknown address).
 * @param label The check prefix, such as "qr unknown book".
 * @param f.status The HTTP status of the page.
 * @param f.caseName The `data-case` value of the page, or null when the page has none.
 * @param expected The case name that the address must show.
 * @returns The check. The status must be below 500 and the case must match.
 */
export function judgeCasePage(label, f, expected) {
  return [{ name: `${label}: shows the ${expected} page (status below 500)`, ok: f.status < 500 && f.caseName === expected, note: `status ${f.status}, case ${f.caseName ?? "none"}` }];
}
