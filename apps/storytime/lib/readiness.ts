/**
 * The readiness rule of a Storytime week (spec FR-5, AC-5.4; plan task 3.1, finding F53).
 *
 * The at-home entry route and the receiving step share this rule. A published week is ready when
 * every book page holds a picture with a file. A page without a file keeps the whole week out of
 * the app, because the page cannot show a picture to a child. The rule reads the week and never
 * changes it.
 *
 * The module holds no imports, so a test loads it with a file URL.
 */

/** The reason that keeps a published week out of the at-home app. */
export type WeekBlocker = "draft" | "missing_picture";

/** One picture of a week, with the final file when production has made it. */
export interface WeekPicture {
  file?: string;
}

/** One page of a book. */
export interface WeekPage {
  image?: WeekPicture;
}

/** One book of a week. */
export interface WeekBook {
  kind: string;
  pages: WeekPage[];
}

/** The part of a week that decides readiness. */
export interface WeekReadiness {
  meta: { status: string };
  books?: WeekBook[];
}

/**
 * Lists the book pages that hold no picture file.
 *
 * A page with no picture entry is missing too, because the page cannot show a picture.
 * @param week The week.
 * @returns One label for each page without a picture file.
 */
export function missingPagePictures(week: WeekReadiness): string[] {
  const labels: string[] = [];
  for (const book of week.books ?? []) {
    book.pages.forEach((page, index) => {
      if (!page.image || !page.image.file) labels.push(`page ${index + 1} of the ${book.kind} book`);
    });
  }
  return labels;
}

/**
 * Gives the reason that keeps a week out of the at-home app.
 * @param week The week.
 * @returns `draft` for a week that is not published, `missing_picture` for a published week with
 * a page picture without a file, and `null` for a ready week.
 */
export function readinessBlocker(week: WeekReadiness): WeekBlocker | null {
  if (week.meta.status !== "published") return "draft";
  if (!week.books || week.books.length === 0) return "missing_picture";
  return missingPagePictures(week).length > 0 ? "missing_picture" : null;
}

/**
 * Reports whether a week may reach a child.
 * @param week The week.
 * @returns `true` when the week is published and every book page picture has a file.
 */
export function isWeekReady(week: WeekReadiness): boolean {
  return readinessBlocker(week) === null;
}
