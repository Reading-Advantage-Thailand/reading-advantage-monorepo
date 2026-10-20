import type { ClassStatus, ClassTrend } from "./teacher-contracts.js";

/** A class is on track from this whole percent of active students in 7 days. */
export const CLASS_ON_TRACK_PERCENT = 70;
/** A class is quiet from this whole percent; a lower percent needs attention. */
export const CLASS_SOME_QUIET_PERCENT = 40;
/** The XP change, in percent, that a trend needs to leave "flat". */
export const CLASS_TREND_PERCENT = 5;

/**
 * Rounds the share of active students to a whole percent, the value that a class row shows.
 * @param active The active students.
 * @param students All students of the class.
 * @returns The whole percent; 0 when there is no student.
 */
export function activeRatePercent(active: number, students: number): number {
  return students === 0 ? 0 : Math.round((100 * active) / students);
}

/**
 * Reads the XP trend of a class. `up` when the previous XP is 0 and the XP is more than 0, or when
 * the change is more than +5 %. `down` when the change is less than -5 %. Else `flat`. The
 * comparison uses whole numbers, so exactly +5 % and -5 % are `flat`.
 * @param xp7d XP of the last 7 days.
 * @param xpPrevious7d XP of the 7 days before.
 * @returns The trend.
 */
export function classTrend(xp7d: number, xpPrevious7d: number): ClassTrend {
  if (xpPrevious7d === 0) return xp7d > 0 ? "up" : "flat";
  const change = 100 * (xp7d - xpPrevious7d);
  if (change > CLASS_TREND_PERCENT * xpPrevious7d) return "up";
  if (change < -CLASS_TREND_PERCENT * xpPrevious7d) return "down";
  return "flat";
}

/**
 * Reads the engagement status of a class from the whole percent that the row shows, so that the
 * status and the shown percent always agree (69.6 % shows as 70 % and is `onTrack`).
 * @param students All students of the class.
 * @param activeRate7d The whole percent of active students in 7 days.
 * @returns `noStudents` for an empty class, else `onTrack` from 70, `someQuiet` from 40, else `needsAttention`.
 */
export function classStatus(students: number, activeRate7d: number): ClassStatus {
  if (students === 0) return "noStudents";
  if (activeRate7d >= CLASS_ON_TRACK_PERCENT) return "onTrack";
  if (activeRate7d >= CLASS_SOME_QUIET_PERCENT) return "someQuiet";
  return "needsAttention";
}
