// Pure module (no database imports), so client components can use it through the
// "@reading-advantage/domain/assignments/due-date" entry.

/** The due-date state of an assignment, for due chips and overdue counts. */
export type DueDateStatus =
  | { kind: "none" }
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "upcoming"; days: number };

const DAY_MS = 86_400_000;

/**
 * Reads the due-date state of an assignment. An empty or invalid due date is "none": the
 * `assignments.due_date` column is nullable, and `new Date(null)` is 1 January 1970, which made
 * assignments without a due date show that date and "Overdue". Days are calendar days in the
 * local time zone of the caller.
 * @param dueDate The due date (a Date, an ISO string from JSON, or empty).
 * @param now The current time.
 * @returns "none"; "overdue" when the due time has passed; "today" when it is later today;
 * "soon" (1 to 3 days) or "upcoming" (4 days or more) with the number of days left.
 */
export function getDueDateStatus(
  dueDate: Date | string | null | undefined,
  now: Date = new Date(),
): DueDateStatus {
  if (dueDate === null || dueDate === undefined || dueDate === "") return { kind: "none" };
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return { kind: "none" };
  if (due.getTime() < now.getTime()) return { kind: "overdue" };
  const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((dayStart(due) - dayStart(now)) / DAY_MS);
  if (days === 0) return { kind: "today" };
  return days <= 3 ? { kind: "soon", days } : { kind: "upcoming", days };
}
