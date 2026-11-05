/**
 * The teacher route rules (spec FR-9, plan task 4.1).
 *
 * The teacher routes stay off the public service until Daniel decides question Q1. The
 * server-side value `STORYTIME_TEACHER_ROUTES` turns them on, and it is on only at the value `1`,
 * the same rule as `STORYTIME_SHOW_DRAFT_MEDIA`. The value stays on the server: no request sets it,
 * and the build never inlines it.
 *
 * The route segments of a teacher route use the same rules as the at-home route: a level from 1 to
 * 4, a week from 1 to 32, and a lesson day from 1 to 5. A segment outside these bounds answers 404
 * and never reaches the content loader.
 */

/** The environment value that turns the teacher routes on. */
export const TEACHER_ROUTES_ENV = "STORYTIME_TEACHER_ROUTES";

/** The highest level of the week contract. */
const LEVEL_MAX = 4;

/** The highest week number of the week contract. */
const WEEK_MAX = 32;

/** The highest lesson day of the week contract. */
const DAY_MAX = 5;

/** The level and the week of one teacher route. */
export interface TeacherRoute {
  /** The level of the week. */
  level: number;
  /** The week of the level. */
  week: number;
}

/**
 * Reports whether the teacher routes are on.
 * @returns `true` only when `STORYTIME_TEACHER_ROUTES` holds the value `1`.
 */
export function teacherRoutesEnabled(): boolean {
  return process.env[TEACHER_ROUTES_ENV] === "1";
}

/**
 * Reads a route segment as a canonical positive number.
 * @param segment The route segment.
 * @param max The highest accepted value.
 * @returns The number, or `null` when the segment is not `^[1-9][0-9]*$` inside the bound.
 */
function parseCanonicalNumber(segment: string, max: number): number | null {
  if (!/^[1-9][0-9]*$/.test(segment)) return null;
  const value = Number(segment);
  return Number.isSafeInteger(value) && value <= max ? value : null;
}

/**
 * Parses the level and the week segments of a teacher route.
 * @param level The level segment.
 * @param week The week segment.
 * @returns The level and the week, or `null` for a path that must answer 404.
 */
export function parseTeacherRoute(level: string, week: string): TeacherRoute | null {
  const levelNumber = parseCanonicalNumber(level, LEVEL_MAX);
  const weekNumber = parseCanonicalNumber(week, WEEK_MAX);
  if (levelNumber === null || weekNumber === null) return null;
  return { level: levelNumber, week: weekNumber };
}

/**
 * Parses the day segment of a teacher route.
 * @param day The day segment.
 * @returns The day number, or `null` for a path that must answer 404.
 */
export function parseTeacherDay(day: string): number | null {
  return parseCanonicalNumber(day, DAY_MAX);
}
