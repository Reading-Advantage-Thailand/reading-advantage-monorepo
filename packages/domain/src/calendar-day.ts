// Pure module (no database imports), so client components can use it through the
// "@reading-advantage/domain/calendar-day" entry.

/**
 * The time zone for calendar days (due dates, streaks) and for date text. The product serves
 * Thai schools; the student session policy in `@reading-advantage/auth` also uses Asia/Bangkok.
 */
export const SCHOOL_TIME_ZONE = "Asia/Bangkok";

const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Reads the calendar date of an instant on the clock of a time zone.
 * @param date The instant.
 * @param timeZone An IANA time zone name.
 * @returns The date as "YYYY-MM-DD".
 */
export function calendarDayKey(date: Date, timeZone: string = SCHOOL_TIME_ZONE): string {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Numbers a calendar date, so the difference of two numbers is a count of days.
 * @param key The date as "YYYY-MM-DD".
 * @returns The days from 1 January 1970 to that date.
 */
export function dayKeyNumber(key: string): number {
  return Date.parse(`${key}T00:00:00Z`) / DAY_MS;
}

/**
 * Numbers the calendar days of a time zone, so the difference of two numbers is a count of days.
 * @param date The instant.
 * @param timeZone An IANA time zone name.
 * @returns The days from 1 January 1970 to the calendar date of the instant in that zone.
 */
export function calendarDayNumber(date: Date, timeZone: string = SCHOOL_TIME_ZONE): number {
  return dayKeyNumber(calendarDayKey(date, timeZone));
}
