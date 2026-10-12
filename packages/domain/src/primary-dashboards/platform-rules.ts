import type { DashboardWindow } from "./contracts.js";
import type { PlatformSchoolStatus } from "./platform-contracts.js";

/**
 * Decides the status of a school. A school with no students has no status to judge. A school
 * with students is quiet when it has no activity event inside the window (the last 7 Bangkok
 * days, today included); the value 7 is a look-check value.
 * @param params.students The students of the school.
 * @param params.lastActivityAt The newest activity event of a student of the school, or null.
 * @param params.window The 7-day window.
 * @returns "no_students", "quiet", or "active".
 */
export function platformSchoolStatus(params: {
  students: number;
  lastActivityAt: Date | null;
  window: DashboardWindow;
}): PlatformSchoolStatus {
  if (params.students === 0) return "no_students";
  if (!params.lastActivityAt || params.lastActivityAt < params.window.start) return "quiet";
  return "active";
}
