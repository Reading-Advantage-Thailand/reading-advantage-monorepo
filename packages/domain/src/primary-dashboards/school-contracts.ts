import { z } from "zod";
import { activeStudentsCountSchema, activeStudentsDaySchema, dashboardRangeSchema } from "./contracts.js";

/** The input of `getSchoolDashboard`. The range is optional; an unknown value gives 30. */
export const schoolDashboardInputSchema = z.object({
  /** The school to read. A caller that is not SYSTEM can name only the session school. */
  schoolId: z.string().uuid(),
  range: dashboardRangeSchema.optional(),
});

/** The input of `getSchoolDashboard`. */
export type SchoolDashboardInput = z.input<typeof schoolDashboardInputSchema>;

const count = z.number().int().nonnegative();

/** The key numbers of the school in the range (FR-3). */
export const schoolKpisSchema = z.object({
  activeStudents: activeStudentsCountSchema,
  activeTeachers: z.object({ active: count, total: count }),
  classesWithActivity: z.object({ active: count, total: count }),
  articlesOpened: count,
  xpEarned: count,
  newStudents: count,
});

/** One row of the adoption tables (FR-4, FR-5). */
export const adoptionRowSchema = z.object({
  /** A CEFR main level ("A0" to "B2") or a class grade ("4") or "none" for students without a class. */
  key: z.string(),
  students: count,
  active: count,
  /** Whole percent of active students. */
  percent: z.number().int().min(0).max(100),
  /** XP earned in the range divided by all students of the row, rounded. */
  averageXp: count,
});

/** One row of the adoption tables. */
export type AdoptionRow = z.infer<typeof adoptionRowSchema>;

/** The codes of the alerts (FR-6). The UI translates each code. */
export const SCHOOL_ALERT_CODES = ["low-activity", "license-ends-soon", "license-ended", "seats-nearly-full"] as const;

/** One alert (FR-6). Nothing is stored; the rules run on each load. */
export const schoolAlertSchema = z.object({
  code: z.enum(SCHOOL_ALERT_CODES),
  severity: z.enum(["critical", "high", "medium"]),
  /** The numbers for the alert text, for example `percent`, `days`, `seatsUsed`, `seats`. */
  values: z.record(z.string(), z.number()),
});

/** One alert. */
export type SchoolAlert = z.infer<typeof schoolAlertSchema>;

/** One row of the teachers table (FR-8). */
export const teacherRowSchema = z.object({
  teacherId: z.string(),
  name: z.string().nullable(),
  classes: count,
  students: count,
  active: count,
  /** Whole percent of active in students. Null when the teacher has no students. */
  engagementPercent: z.number().int().min(0).max(100).nullable(),
});

/** One row of the teachers table. */
export type TeacherRow = z.infer<typeof teacherRowSchema>;

/** The activity by day panel (FR-9). */
export const activityByDaySchema = z.object({
  days: z.array(activeStudentsDaySchema),
  /** The activity events in the range. */
  totalEvents: count,
  /** The day with the most active students. Null when no day has an active student. */
  peakDay: activeStudentsDaySchema.nullable(),
  /** The mean of the daily active students over all days of the range, rounded to 1 decimal place. */
  dailyAverage: z.number().nonnegative(),
});

/** The output of `getSchoolDashboard`. */
export const schoolDashboardSchema = z.object({
  schoolId: z.string().uuid(),
  range: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  /** The first and last Bangkok day of the range, "YYYY-MM-DD". */
  startDay: z.string(),
  endDay: z.string(),
  kpis: schoolKpisSchema,
  adoptionByCefr: z.array(adoptionRowSchema),
  adoptionByGrade: z.array(adoptionRowSchema),
  alerts: z.array(schoolAlertSchema),
  teachers: z.array(teacherRowSchema),
  activityByDay: activityByDaySchema,
});

/** The output of `getSchoolDashboard`. */
export type SchoolDashboard = z.infer<typeof schoolDashboardSchema>;
