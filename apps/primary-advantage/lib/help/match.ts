import { HELP_VIDEOS, type HelpAudience, type HelpVideo } from "./videos";

/**
 * Scores a route pattern against a path. A static segment scores 2, a dynamic segment 1, and a
 * catch-all 1, so a more specific pattern scores higher.
 * @param pattern A route pattern in folder form, for example `/teacher/class-roster/[classroomId]`.
 * @param pathname The current path without the locale; a query, a hash, or a trailing slash is ignored.
 * @returns The score, or null when the pattern does not match the path.
 */
export function routeScore(pattern: string, pathname: string): number | null {
  const want = pattern.split("/").filter(Boolean);
  const have = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  let score = 0;
  for (const [i, segment] of want.entries()) {
    if (segment.startsWith("[[...")) return score + 1;
    if (segment.startsWith("[...")) return have.length > i ? score + 1 : null;
    if (i >= have.length) return null;
    if (segment.startsWith("[")) score += 1;
    else if (segment === have[i]) score += 2;
    else return null;
  }
  return want.length === have.length ? score : null;
}

/**
 * Finds the help videos for a page (spec FR-2, FR-4).
 * @param pathname The current path without the locale.
 * @param audience The audience of the panel.
 * @param videos The registry; the default is every help video.
 * @returns `matched`: the enabled videos of the page, best match first (registry order on a tie);
 *   `general`: the other enabled general videos of the audience.
 */
export function helpVideosFor(
  pathname: string,
  audience: HelpAudience,
  videos: readonly HelpVideo[] = HELP_VIDEOS,
): { matched: HelpVideo[]; general: HelpVideo[] } {
  const own = videos.filter((video) => video.enabled && video.audience === audience);
  const matched = own
    .map((video, order) => ({ video, order, score: Math.max(-1, ...video.routes.map((route) => routeScore(route, pathname) ?? -1)) }))
    .filter((m) => m.score >= 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((m) => m.video);
  return { matched, general: own.filter((video) => video.general && !matched.includes(video)) };
}

/** A path segment that names a record (it has a digit: an id, a number, a username) or has other characters. */
const isId = (segment: string) => /\d/.test(segment) || /[^A-Za-z0-9.-]/.test(segment);

/**
 * The page path for the help events (FR-11): ids become `[id]`, so the report counts one row per page.
 * @param pathname The path without the locale, for example `/teacher/class-roster/abc-123-uuid`.
 * @returns The pattern, for example `/teacher/class-roster/[id]`, at most 200 characters.
 * @example pagePattern("/teacher/class-roster/830b7de6-7b63-486f-8050-25b6c027b0c3/qr-cards") // "/teacher/class-roster/[id]/qr-cards"
 */
export function pagePattern(pathname: string): string {
  const segments = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  return `/${segments.map((segment) => (isId(segment) ? "[id]" : segment)).join("/")}`.slice(0, 200);
}
