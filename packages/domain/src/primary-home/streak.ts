/**
 * Counts consecutive calendar days of activity ending today.
 * Days use the server local timezone, like the "cards studied today" stat.
 * A streak with no activity yet today stays alive if yesterday has activity.
 * @param activityDates Timestamps of activity rows, in any order.
 * @param now The current time.
 * @returns The number of consecutive active days, or 0 when the streak is broken.
 */
export function countStreakDays(activityDates: readonly Date[], now: Date = new Date()): number {
  const dayKey = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = new Set(activityDates.map(dayKey));
  const cursor = new Date(dayKey(now));
  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
