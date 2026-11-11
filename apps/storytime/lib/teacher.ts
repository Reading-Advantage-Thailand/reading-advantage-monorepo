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

import { LEVEL_MAX, WEEK_MAX } from "./contracts/week";
import { parseCanonicalNumber } from "./route-parse";
import type { StorytimeUser } from "./auth";

/** The environment value that turns the teacher routes on. */
export const TEACHER_ROUTES_ENV = "STORYTIME_TEACHER_ROUTES";

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

/** The result of the guard of one teacher page. */
export type TeacherGate =
  | { kind: "off" }
  | { kind: "forbidden" }
  | { kind: "ok"; teacher: StorytimeUser };

/**
 * Runs the fixed guard order of the teacher pages (plan task 4.1, AC-4.6, AC-9.3).
 *
 * The order is a recorded rule of the product (test strategy P4, amendment 2026-11-11): the
 * session first, so a visitor without a session goes to the sign-in page through the session
 * read; then the teacher switch, which answers 404 for every session while the flag is off;
 * then the role, which answers the 403 page for a session of another role. The pages render
 * the 403 view and call `notFound()` from the result.
 *
 * The session read is a parameter, so the rule is one behavior-testable function and the pages
 * stay thin. `requireRole` is the production session read; it redirects a visitor without a
 * session and returns `null` for a session of another role.
 * @param requireTeacher The session read of the route, in the order of the rule.
 * @param returnPath The path the visitor came from.
 * @returns `off` when the flag is off, `forbidden` for a session of another role, and `ok`
 *   with the teacher for a teacher session.
 */
export async function guardTeacherPage(
  requireTeacher: (returnPath: string) => Promise<StorytimeUser | null>,
  returnPath: string,
): Promise<TeacherGate> {
  const teacher = await requireTeacher(returnPath);
  if (!teacherRoutesEnabled()) return { kind: "off" };
  if (!teacher) return { kind: "forbidden" };
  return { kind: "ok", teacher };
}
