import { toCsvText } from "../csv.js";
import type { TeacherClassRow } from "./teacher-contracts.js";

/** The header row of the class table file (FR-10). */
export const TEACHER_CLASS_CSV_HEADER = [
  "class",
  "grade",
  "students",
  "active_7d",
  "active_rate_7d",
  "average_level",
  "xp_7d",
  "xp_previous_7d",
  "trend",
  "status",
] as const;

/**
 * Formats the class table of the teacher home as CSV. The function is pure, so the browser can run
 * it on the rows that the table shows, in the order that the table shows.
 * @param rows The class rows, in the shown order.
 * @returns The CSV text with the header row. A missing grade or average level gives an empty cell.
 */
export function toTeacherClassCsv(rows: readonly TeacherClassRow[]): string {
  return toCsvText(
    TEACHER_CLASS_CSV_HEADER,
    rows.map((row) => [row.name, row.grade, row.students, row.active7d, row.activeRate7d, row.averageLevel, row.xp7d, row.xpPrevious7d, row.trend, row.status]),
  );
}
