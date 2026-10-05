import { SCHOOL_TIME_ZONE, calendarDayKey, calendarDayNumber, dayKeyNumber } from "../calendar-day.js";

/**
 * Counts consecutive calendar days of activity ending today, from calendar dates (for example
 * the distinct days that the database returns). A streak with no activity yet today stays alive
 * if yesterday has activity.
 * @param activityDays The dates with activity as "YYYY-MM-DD", in any order.
 * @param now The current time.
 * @param timeZone The time zone of "today" (Asia/Bangkok by default, as for due dates).
 * @returns The number of consecutive active days, or 0 when the streak is broken.
 */
export function countStreakFromDays(
  activityDays: Iterable<string>,
  now: Date = new Date(),
  timeZone: string = SCHOOL_TIME_ZONE,
): number {
  const days = new Set(Array.from(activityDays, dayKeyNumber));
  let cursor = calendarDayNumber(now, timeZone);
  if (!days.has(cursor)) cursor -= 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= 1;
  }
  return streak;
}

/**
 * Counts consecutive calendar days of activity ending today, from activity timestamps.
 * Days are calendar days in Asia/Bangkok by default (not the server time zone, UTC on Cloud Run).
 * A streak with no activity yet today stays alive if yesterday has activity.
 * @param activityDates Timestamps of activity rows, in any order.
 * @param now The current time.
 * @param timeZone The time zone of the calendar days.
 * @returns The number of consecutive active days, or 0 when the streak is broken.
 */
export function countStreakDays(
  activityDates: readonly Date[],
  now: Date = new Date(),
  timeZone: string = SCHOOL_TIME_ZONE,
): number {
  return countStreakFromDays(activityDates.map((date) => calendarDayKey(date, timeZone)), now, timeZone);
}
