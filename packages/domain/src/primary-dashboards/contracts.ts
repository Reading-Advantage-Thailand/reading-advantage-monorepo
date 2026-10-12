import { z } from "zod";

/** The ranges (in calendar days) that a dashboard offers. */
export const DASHBOARD_RANGES = [7, 30, 90] as const;
/** The range that the dashboards use when the value is missing or unknown. */
export const DEFAULT_DASHBOARD_RANGE = 30;

/** One dashboard range in days: 7, 30, or 90. */
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

/**
 * Reads a range value. A number or a numeric string of 7, 30, or 90 passes. Every other value,
 * including a missing value, gives 30. The schema never fails.
 */
export const dashboardRangeSchema = z.preprocess(
  (value) => {
    const days = typeof value === "string" ? Number(value.trim() === "" ? Number.NaN : value) : value;
    return (DASHBOARD_RANGES as readonly unknown[]).includes(days) ? days : DEFAULT_DASHBOARD_RANGE;
  },
  z.union([z.literal(7), z.literal(30), z.literal(90)]),
);

/**
 * The set of students that a count covers. `school` covers all STUDENT users of one school.
 * The teacher home adds a `classes` kind and the system dashboard adds a `platform` kind later.
 */
export const activityScopeSchema = z.object({
  kind: z.literal("school"),
  schoolId: z.string().uuid(),
});

/** The set of students that a count covers. */
export type ActivityScope = z.infer<typeof activityScopeSchema>;

/** A window of Bangkok calendar days: the last N days, today included. */
export const dashboardWindowSchema = z.object({
  /** The number of calendar days. */
  days: z.number().int().positive(),
  /** The first day as "YYYY-MM-DD" (Asia/Bangkok). */
  startDay: z.string(),
  /** The last day (today) as "YYYY-MM-DD" (Asia/Bangkok). */
  endDay: z.string(),
  /** Every day of the window, first to last. */
  dayKeys: z.array(z.string()),
  /** The start of the first day, as an instant (inclusive). */
  start: z.date(),
  /** The start of the day after the last day, as an instant (exclusive). */
  end: z.date(),
});

/** A window of Bangkok calendar days. */
export type DashboardWindow = z.infer<typeof dashboardWindowSchema>;

/** Active students of a scope in a window. */
export const activeStudentsCountSchema = z.object({
  /** Students with at least one activity event in the window. */
  active: z.number().int().nonnegative(),
  /** All students of the scope. */
  total: z.number().int().nonnegative(),
  /** Whole percent of active in total. Null when the scope has no students. */
  percent: z.number().int().min(0).max(100).nullable(),
});

/** Active students of a scope in a window. */
export type ActiveStudentsCount = z.infer<typeof activeStudentsCountSchema>;

/** The number of distinct active students on one Bangkok day. */
export const activeStudentsDaySchema = z.object({
  /** The day as "YYYY-MM-DD" (Asia/Bangkok). */
  day: z.string(),
  activeStudents: z.number().int().nonnegative(),
});

/** The number of distinct active students on one Bangkok day. */
export type ActiveStudentsDay = z.infer<typeof activeStudentsDaySchema>;
