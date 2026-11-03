/**
 * The readiness rule of a Storytime week (spec FR-5, AC-5.4, AC-5.5; plan tasks 3.1 and 3.1a,
 * finding F53).
 *
 * The at-home entry route and the receiving step share this rule. A published week is ready when
 * every book page holds a picture with a file, and when the images, audio, and song parts of
 * `approval` are each approved. A page without a file keeps the whole week out of the app, because
 * the page cannot show a picture to a child. An approval part that is absent, or that holds no
 * status, counts as draft. The rule reads the week and never changes it.
 *
 * The module holds no imports, so a test loads it with a file URL.
 */

/** The reason that keeps a published week out of the at-home app. */
export type WeekBlocker = "draft" | "missing_picture" | "media_not_approved";

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
  /** Production owns the shape; the rule reads only the status of the three media parts. */
  approval?: unknown;
}

/** The media parts of a week whose approval decides readiness (spec FR-5, AC-5.5). */
export const MEDIA_APPROVAL_PARTS = ["images", "audio", "song"] as const;

/** One media part that a week must have approved. */
export type MediaApprovalPart = (typeof MEDIA_APPROVAL_PARTS)[number];

/**
 * Reads the status of one media part.
 * @param approval The approval entry of the week, or a value of another shape.
 * @param part The media part.
 * @returns The status, or `draft` when the part is absent or holds no status text.
 */
function mediaPartStatus(approval: unknown, part: MediaApprovalPart): string {
  if (!approval || typeof approval !== "object") return "draft";
  const entry = (approval as Record<string, unknown>)[part];
  if (!entry || typeof entry !== "object") return "draft";
  const status = (entry as Record<string, unknown>).status;
  return typeof status === "string" ? status : "draft";
}

/**
 * Lists the media parts of a week that are not approved (spec FR-5, AC-5.5).
 * @param week The week.
 * @returns One part name for each part that is not approved, in the order images, audio, song.
 */
export function mediaPartsNotApproved(week: WeekReadiness): MediaApprovalPart[] {
  return MEDIA_APPROVAL_PARTS.filter((part) => mediaPartStatus(week.approval, part) !== "approved");
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
 * a page picture without a file, `media_not_approved` for a published week whose images, audio, or
 * song part is not approved, and `null` for a ready week.
 */
export function readinessBlocker(week: WeekReadiness): WeekBlocker | null {
  if (week.meta.status !== "published") return "draft";
  if (!week.books || week.books.length === 0) return "missing_picture";
  if (missingPagePictures(week).length > 0) return "missing_picture";
  return mediaPartsNotApproved(week).length > 0 ? "media_not_approved" : null;
}

/**
 * Reports whether a week may reach a child.
 * @param week The week.
 * @returns `true` when the week is published, every book page picture has a file, and the images,
 * audio, and song parts are each approved.
 */
export function isWeekReady(week: WeekReadiness): boolean {
  return readinessBlocker(week) === null;
}
