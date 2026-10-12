import { z } from "zod";

/** The status of a school in the schools table: quiet, active, or no students. */
export const platformSchoolStatusSchema = z.enum(["quiet", "active", "no_students"]);

/** The status of a school in the schools table. */
export type PlatformSchoolStatus = z.infer<typeof platformSchoolStatusSchema>;

const count = z.number().int().nonnegative();

/** The totals strip of the system dashboard (FR-2). */
export const platformTotalsSchema = z.object({
  /** All schools. */
  schools: count,
  /** STUDENT users who have a school. */
  students: count,
  /** TEACHER users who have a school. */
  teachers: count,
  /** Students with at least one activity event in the window. */
  activeStudents: count,
  /** `ARTICLE_READ` rows that students created in the window. */
  articlesOpened: count,
  /** Students of the schools that have an active license with seats. */
  seatsUsed: count,
  /** The sum of seats of all schools that have an active license with seats. */
  seats: count,
  /** STUDENT users with no school. */
  studentsWithoutSchool: count,
});

/** The totals strip of the system dashboard. */
export type PlatformTotals = z.infer<typeof platformTotalsSchema>;

/** One row of the schools table (FR-3). */
export const platformSchoolRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  students: count,
  activeStudents: count,
  /** Whole percent of active students in students. Null when the school has no students. */
  activePercent: z.number().int().min(0).max(100).nullable(),
  articlesOpened: count,
  /** The students of the school (only students take a seat). */
  seatsUsed: count,
  /** The seats of the active licenses. Null means "No license". */
  seats: count.nullable(),
  /** The instant of the newest activity event of a student of the school. Null when there is none. */
  lastActivityAt: z.string().nullable(),
  /** The Bangkok calendar day of `lastActivityAt` as "YYYY-MM-DD". */
  lastActivityDay: z.string().nullable(),
  status: platformSchoolStatusSchema,
});

/** One row of the schools table. */
export type PlatformSchoolRow = z.infer<typeof platformSchoolRowSchema>;

/** The output of `getPlatformOverview`. */
export const platformOverviewSchema = z.object({
  /** The first day of "this week" (Asia/Bangkok), "YYYY-MM-DD". */
  startDay: z.string(),
  /** The last day of "this week" (today), "YYYY-MM-DD". */
  endDay: z.string(),
  totals: platformTotalsSchema,
  /** One row for each school: quiet schools first, then active, then no students; then by name. */
  schools: z.array(platformSchoolRowSchema),
});

/** The output of `getPlatformOverview`. */
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;
