import type { DateRange } from "react-day-picker";

import type { UserXpLog } from "@/types";

/** One plotted day in the cumulative XP dashboard chart. */
export interface CumulativeXpChartPoint {
  /** Localized short day label. */
  readonly day: string;
  /** Total XP earned through the end of this day. */
  readonly xpEarned: number;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(value: Date): Date {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

function sameDay(left: Date, right: Date): boolean {
  return left.toDateString() === right.toDateString();
}

/**
 * Produces cumulative daily XP points while retaining all totals before the requested range.
 * @param logs XP delta records for the current student.
 * @param calendarValue The inclusive date range selected in the dashboard.
 * @returns One cumulative XP total for each local calendar day in the range.
 */
export function formatCumulativeXpForDays(
  logs: readonly UserXpLog[],
  calendarValue: DateRange | undefined,
): readonly CumulativeXpChartPoint[] {
  const firstDay = startOfDay(calendarValue?.from ?? new Date());
  const lastDay = startOfDay(calendarValue?.to ?? calendarValue?.from ?? new Date());
  let runningTotal = logs
    .filter((log) => new Date(log.createdAt) < firstDay)
    .reduce((total, log) => total + log.xpEarned, 0);
  const points: CumulativeXpChartPoint[] = [];

  for (const day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
    runningTotal += logs
      .filter((log) => sameDay(startOfDay(new Date(log.createdAt)), day))
      .reduce((total, log) => total + log.xpEarned, 0);
    points.push({ day: `${DAYS_OF_WEEK[day.getDay()]} ${day.getDate()}`, xpEarned: runningTotal });
  }
  return points;
}
