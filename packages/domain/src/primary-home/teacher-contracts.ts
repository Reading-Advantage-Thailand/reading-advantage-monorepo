import { z } from "zod";

/** A student needs help after this many calendar days (Asia/Bangkok) without any activity. */
export const TEACHER_HOME_INACTIVE_DAYS = 7;
/** The most open assignments the dashboard lists. `openAssignmentCount` has the full number. */
export const TEACHER_HOME_ASSIGNMENT_LIMIT = 6;
/** The most students the "who needs help" list shows. `needsHelpCount` has the full number. */
export const TEACHER_HOME_HELP_LIMIT = 8;

/** The XP trend of a class: the last 7 days against the 7 days before. */
export const classTrendSchema = z.enum(["up", "flat", "down"]);
/** The XP trend of a class. */
export type ClassTrend = z.infer<typeof classTrendSchema>;

/** The engagement status of a class, from the whole percent of active students in 7 days. */
export const classStatusSchema = z.enum(["noStudents", "onTrack", "someQuiet", "needsAttention"]);
/** The engagement status of a class. */
export type ClassStatus = z.infer<typeof classStatusSchema>;

/** One row of the class table of the teacher home. */
export const teacherClassRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.number().nullable(),
  /** Distinct STUDENT users of the school in the class. */
  students: z.number().int().nonnegative(),
  /** Students with an activity event in the last 7 Bangkok days (today and the 6 days before). */
  active7d: z.number().int().nonnegative(),
  /** Whole percent of `active7d` in `students`; 0 when the class has no student. The status reads this value. */
  activeRate7d: z.number().int().min(0).max(100),
  /** Mean Primary level with one decimal; null when the class has no student. */
  averageLevel: z.number().nullable(),
  /** XP earned in the last 7 days. */
  xp7d: z.number().int().nonnegative(),
  /** XP earned in the 7 days before the last 7 days. */
  xpPrevious7d: z.number().int().nonnegative(),
  trend: classTrendSchema,
  status: classStatusSchema,
});
/** One row of the class table of the teacher home. */
export type TeacherClassRow = z.infer<typeof teacherClassRowSchema>;

/** One class of the teacher with its student count. */
export const teacherHomeClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.number().nullable(),
  studentCount: z.number().int().nonnegative(),
});

/** An assignment that at least one student has not finished. */
export const teacherHomeAssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  classroomId: z.string(),
  classroomName: z.string(),
  /** Null when the teacher set no due date. */
  dueDate: z.date().nullable(),
  /** Students who got the assignment. */
  assigned: z.number().int().nonnegative(),
  /** Students who finished it. */
  completed: z.number().int().nonnegative(),
});

/** A student with late work, or with no activity for {@link TEACHER_HOME_INACTIVE_DAYS} days or more. */
export const teacherHomeStudentSchema = z.object({
  studentId: z.string(),
  /** The display name, or the username when the student has no name. */
  name: z.string(),
  username: z.string().nullable(),
  /** The first of the teacher's classes that has the student. */
  classroomId: z.string(),
  classroomName: z.string(),
  /** Unfinished assignments whose due day is before today. */
  overdueCount: z.number().int().nonnegative(),
  /** The newest activity of the student, or null when there is none. */
  lastActiveAt: z.date().nullable(),
});

/**
 * Data for the Primary teacher dashboard (Lane C Phase 3). The function takes no external input:
 * every value is read for the signed-in teacher's classes in the teacher's school.
 */
export const teacherHomeOutput = z.object({
  classes: z.array(teacherHomeClassSchema),
  /** Distinct students in all the teacher's classes. */
  studentCount: z.number().int().nonnegative(),
  /** Earliest due date first, no due date last; at most {@link TEACHER_HOME_ASSIGNMENT_LIMIT}. */
  openAssignments: z.array(teacherHomeAssignmentSchema),
  openAssignmentCount: z.number().int().nonnegative(),
  /** Most late work first, then the longest without activity; at most {@link TEACHER_HOME_HELP_LIMIT}. */
  needsHelp: z.array(teacherHomeStudentSchema),
  needsHelpCount: z.number().int().nonnegative(),
  /** Distinct students with an activity event in the last 30 Bangkok days. */
  activeStudents30d: z.number().int().nonnegative(),
  /** Whole percent of `activeStudents30d` in `studentCount`; 0 when there is no student. */
  engagementRate30d: z.number().int().min(0).max(100),
  /** Mean Primary level of the distinct students, one decimal; null when there is no student. */
  averageLevel: z.number().nullable(),
  /** Distinct students with an activity event on the Bangkok day of today. */
  activeToday: z.number().int().nonnegative(),
  /** Student assignments finished on the Bangkok day of today (by `completed_at`). */
  completedToday: z.number().int().nonnegative(),
  /** One row for each class, in the order of `classes` (by name). */
  classRows: z.array(teacherClassRowSchema),
});

/** Data for the Primary teacher dashboard. */
export type TeacherHome = z.infer<typeof teacherHomeOutput>;
