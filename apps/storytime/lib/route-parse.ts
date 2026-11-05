/**
 * The canonical route-segment rules of the Storytime app (spec FR-5, finding F127).
 *
 * The at-home route and the teacher route accept a level, a week, and a day only as canonical
 * positive numbers inside the contract bounds. Any other form answers 404 and never reaches the
 * content loader. The accepted locales come from the caller, so this module holds no Next.js or
 * next-intl import, and its tests run in the plain node environment.
 */
import { LEVEL_MAX, WEEK_MAX } from "./contracts/week";

/** The longest part of one route segment that the blocked-route log shows. */
const LOG_SEGMENT_MAX = 80;

/** The level and the week of one parsed route. */
export interface StorytimeRoute {
  /** The level of the week. */
  level: number;
  /** The week of the level. */
  week: number;
}

/**
 * Reads a route segment as a canonical positive number.
 * @param segment The route segment.
 * @param max The highest accepted value.
 * @returns The number, or `null` when the segment is not `^[1-9][0-9]*$` inside the bound.
 */
export function parseCanonicalNumber(segment: string, max: number): number | null {
  if (!/^[1-9][0-9]*$/.test(segment)) return null;
  const value = Number(segment);
  return Number.isSafeInteger(value) && value <= max ? value : null;
}

/**
 * Escapes one route segment for the blocked-route log. A raw segment can hold a newline or a
 * carriage return, which would forge a log line (finding F133), so the value is JSON-quoted
 * with control characters escaped and cut to a bounded length. `JSON.stringify` leaves DEL
 * (U+007F), the C1 range (U+0080 to U+009F), U+2028, and U+2029 raw, so the escape rewrites
 * them too (finding F144).
 * @param segment The route segment.
 * @returns The escaped and bounded segment text, with its quotes.
 */
function logSegment(segment: string): string {
  return JSON.stringify(segment.slice(0, LOG_SEGMENT_MAX)).replace(
    /[\u007f-\u009f\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/**
 * Parses the level and the week segments of an at-home route against the accepted locales and
 * the contract bounds. An unparsable path is logged once and answers 404; the log quotes every
 * segment, so no segment can forge a log line (finding F133).
 * @param locales The accepted locales of the routing config.
 * @param locale The locale segment.
 * @param level The level segment.
 * @param week The week segment.
 * @returns The level and the week, or `null` for a path that must answer 404.
 */
export function parseStorytimeRoute(
  locales: readonly string[],
  locale: string,
  level: string,
  week: string,
): StorytimeRoute | null {
  const localeKnown = locales.includes(locale);
  const levelNumber = localeKnown ? parseCanonicalNumber(level, LEVEL_MAX) : null;
  const weekNumber = localeKnown ? parseCanonicalNumber(week, WEEK_MAX) : null;
  if (levelNumber !== null && weekNumber !== null) return { level: levelNumber, week: weekNumber };
  console.warn(
    `storytime week ${logSegment(locale)}/${logSegment(level)}/${logSegment(week)} blocked: invalid`,
  );
  return null;
}
