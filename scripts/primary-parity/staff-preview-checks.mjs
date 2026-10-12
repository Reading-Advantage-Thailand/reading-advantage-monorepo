// Pure helpers of the staff preview block of cutover-check.mjs (track primary_parity_staff_student_view_20261011,
// Story S1 to S4). They hold no browser code, so a node test can run them. They never see a password or a name.
// Check names start with "staff". The block reads pages only; it saves nothing.

/** The student pages that staff open in preview. `notice` is true when the page shows a preview notice. */
export const STAFF_PREVIEW_PAGES = [
  { path: "/student/home", notice: true },
  { path: "/student/avatar", notice: false },
  { path: "/student/avatar/shop", notice: false },
  { path: "/student/history", notice: true },
  { path: "/student/reports", notice: true },
  { path: "/student/sentences", notice: true },
  { path: "/student/vocabulary", notice: true },
  { path: "/student/quest/battle", notice: true },
  { path: "/student/reedy", notice: true },
  { path: "/student/games", notice: false },
  { path: "/student/read", notice: false },
];

/**
 * Judges one student page opened by a staff member.
 * @param label The check prefix, such as "staff teacher home".
 * @param f.status The HTTP status of the page.
 * @param f.pathname The path after the redirects.
 * @param f.hasBanner True when `[data-preview-banner]` shows.
 * @param f.hasNotice True when `[data-preview-notice]` shows.
 * @param f.text The page text, used only to find the error page title.
 * @param needsNotice True when the page must show the preview notice.
 * @returns The checks, each with a name, a result, and a note.
 */
export function judgePreviewPage(label, f, needsNotice) {
  const checks = [
    { name: `${label}: stays on the student page`, ok: /\/student(\/|$)/.test(f.pathname ?? "") && !/unauthorized/.test(f.pathname ?? ""), note: f.pathname ?? "" },
    { name: `${label}: status below 500`, ok: f.status < 500, note: `status ${f.status}` },
    { name: `${label}: Preview banner shows`, ok: !!f.hasBanner, note: "" },
    { name: `${label}: shows no error page`, ok: !/Something went wrong/.test(f.text ?? ""), note: "" },
  ];
  if (needsNotice) checks.push({ name: `${label}: preview notice shows`, ok: !!f.hasNotice, note: "" });
  return checks;
}
