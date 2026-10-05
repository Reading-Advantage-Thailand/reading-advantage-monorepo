// Pure module (no database imports), so client components can use it through the
// "@reading-advantage/domain/assignments/due-date" entry.
import { SCHOOL_TIME_ZONE, calendarDayNumber } from "../calendar-day.js";

/** The due-date state of an assignment, for due chips and overdue counts. */
export type DueDateStatus =
  | { kind: "none" }
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "upcoming"; days: number };

/**
 * Reads the due-date state of an assignment. An empty or invalid due date is "none": the
 * `assignments.due_date` column is nullable, and `new Date(null)` is 1 January 1970, which made
 * assignments without a due date show that date and "Overdue". The state compares calendar days
 * in the school time zone, not instants: the teacher calendar stores one instant of the chosen
 * day (midnight, or the server end of day), so the whole due day is "today", and "overdue" starts
 * on the next day.
 * @param dueDate The due date (a Date, an ISO string from JSON, or empty).
 * @param now The current time.
 * @param timeZone The time zone of the calendar days (Asia/Bangkok by default).
 * @returns "none"; "overdue" when the due day is before today; "today" on the due day;
 * "soon" (1 to 3 days) or "upcoming" (4 days or more) with the number of days left.
 */
export function getDueDateStatus(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
  timeZone: string = SCHOOL_TIME_ZONE,
): DueDateStatus {
  if (dueDate === null || dueDate === undefined || dueDate === "") return { kind: "none" };
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { kind: "none" };
  const days = calendarDayNumber(due, timeZone) - calendarDayNumber(now, timeZone);
  if (days < 0) return { kind: "overdue" };
  if (days === 0) return { kind: "today" };
  return days <= 3 ? { kind: "soon", days } : { kind: "upcoming", days };
}
