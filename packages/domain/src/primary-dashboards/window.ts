import { SCHOOL_TIME_ZONE, calendarDayKey, dayKeyNumber } from "../calendar-day.js";
import type { DashboardWindow } from "./contracts.js";

const DAY_MS = 86_400_000;

/**
 * Builds the window of the last N Bangkok calendar days, today included. Asia/Bangkok has no
 * daylight saving time, so each day is 24 hours.
 * @param days The number of calendar days (7, 30, or 90).
 * @param now The current instant. Tests replace it.
 * @returns The first and last day, every day key, and the start (inclusive) and end (exclusive) instants.
 */
export function dashboardWindow(days: number, now: Date = new Date()): DashboardWindow {
  const endDay = calendarDayKey(now, SCHOOL_TIME_ZONE);
  const endNumber = dayKeyNumber(endDay);
  const dayKeys = Array.from({ length: days }, (_, index) =>
    new Date((endNumber - (days - 1 - index)) * DAY_MS).toISOString().slice(0, 10),
  );
  const startDay = dayKeys[0] ?? endDay;
  // The Bangkok offset is a fixed +07:00 (no daylight saving time).
  const start = new Date(Date.parse(`${startDay}T00:00:00+07:00`));
  const end = new Date(Date.parse(`${endDay}T00:00:00+07:00`) + DAY_MS);
  return { days, startDay, endDay, dayKeys, start, end };
}
