import type { DB } from "@reading-advantage/db";
import { assertCan, type UserContext } from "@reading-advantage/auth";
import { calendarDayKey } from "../calendar-day.js";
import { createTenantDB } from "../db-contract.js";
import { getSeatUsageBySchool } from "../licenses/usage.js";
import { countStudentsWithoutSchool, countTeachersBySchool, getPlatformSchoolActivity } from "./activity.js";
import { platformOverviewSchema, type PlatformOverview, type PlatformSchoolRow, type PlatformSchoolStatus } from "./platform-contracts.js";
import { platformSchoolStatus } from "./platform-rules.js";
import { dashboardWindow } from "./window.js";

/** The days of "this week": the last 7 Bangkok calendar days, today included. */
const PLATFORM_WINDOW_DAYS = 7;

/** The order of the statuses in the table: quiet schools first. */
const STATUS_ORDER: Record<PlatformSchoolStatus, number> = { quiet: 0, active: 1, no_students: 2 };

/**
 * Reads the system dashboard: the platform totals and one row for each school. Only SYSTEM may
 * call it. It runs four grouped queries (school activity, teachers, students without a school,
 * seat usage); the count of queries does not grow with the count of schools.
 * @param params.db The database.
 * @param params.user The caller. The role must be SYSTEM.
 * @param params.now The current instant. Tests replace it.
 * @returns The totals and the school rows: quiet first, then active, then no students; each group by name.
 * @throws {AuthError} FORBIDDEN when the caller is not SYSTEM.
 */
export async function getPlatformOverview(params: { db: DB; user: UserContext; now?: Date }): Promise<PlatformOverview> {
  assertCan(params.user, "system:dashboard:read");
  // SYSTEM reads every school. Each count below groups by users.school_id.
  const db = createTenantDB(params.db, { schoolId: null }).unscoped(
    "system dashboard: SYSTEM only (system:dashboard:read); reads all schools; every count groups by users.school_id",
  );
  const window = dashboardWindow(PLATFORM_WINDOW_DAYS, params.now ?? new Date());
  const [activity, teachers, studentsWithoutSchool, seatUsage] = await Promise.all([
    getPlatformSchoolActivity({ db, window }),
    countTeachersBySchool({ db }),
    countStudentsWithoutSchool({ db }),
    getSeatUsageBySchool({ db, now: params.now }),
  ]);

  const schools: PlatformSchoolRow[] = activity.map((row) => {
    const seats = seatUsage.get(row.schoolId)?.seats ?? null;
    return {
      id: row.schoolId,
      name: row.name,
      students: row.students,
      activeStudents: row.activeStudents,
      activePercent: row.students === 0 ? null : Math.round((100 * row.activeStudents) / row.students),
      articlesOpened: row.articlesOpened,
      seatsUsed: row.students,
      seats,
      lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
      lastActivityDay: row.lastActivityAt ? calendarDayKey(row.lastActivityAt) : null,
      status: platformSchoolStatus({ students: row.students, lastActivityAt: row.lastActivityAt, window }),
    };
  });
  // The query orders by name; this sort is stable, so each group keeps the name order.
  schools.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  const sum = (pick: (row: PlatformSchoolRow) => number) => schools.reduce((total, row) => total + pick(row), 0);
  const licensed = schools.filter((row) => row.seats !== null);
  return platformOverviewSchema.parse({
    startDay: window.startDay,
    endDay: window.endDay,
    totals: {
      schools: schools.length,
      students: sum((row) => row.students),
      teachers: [...teachers.values()].reduce((total, n) => total + n, 0),
      activeStudents: sum((row) => row.activeStudents),
      articlesOpened: sum((row) => row.articlesOpened),
      seatsUsed: licensed.reduce((total, row) => total + row.seatsUsed, 0),
      seats: licensed.reduce((total, row) => total + (row.seats ?? 0), 0),
      studentsWithoutSchool,
    },
    schools,
  });
}
