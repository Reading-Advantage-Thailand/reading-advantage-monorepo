import { z } from "zod";

/**
 * Input schema for fetching a teacher's classes.
 */
export const GetTeacherClassesInput = z.object({
  teacherId: z.string().min(1),
});
export type GetTeacherClassesInput = z.infer<typeof GetTeacherClassesInput>;

/**
 * Output schema for a single class returned by getTeacherClasses.
 */
export const TeacherClassOutput = z.object({
  id: z.string().uuid(),
  name: z.string(),
  gradeLevel: z.number().int(),
  joinCode: z.string(),
  standardsAlignment: z.string(),
  createdAt: z.date(),
});
export type TeacherClassOutput = z.infer<typeof TeacherClassOutput>;

/**
 * Output schema for getTeacherClasses — array of classes.
 */
export const GetTeacherClassesOutput = z.array(TeacherClassOutput);
export type GetTeacherClassesOutput = z.infer<typeof GetTeacherClassesOutput>;

/**
 * Output schema for a class with student count.
 */
export const TeacherClassWithCountOutput = TeacherClassOutput.extend({
  studentCount: z.number().int().nonnegative(),
});
export type TeacherClassWithCountOutput = z.infer<typeof TeacherClassWithCountOutput>;

/**
 * Output schema for getTeacherClassesWithCounts — array of classes with student counts.
 */
export const GetTeacherClassesWithCountsOutput = z.array(TeacherClassWithCountOutput);
export type GetTeacherClassesWithCountsOutput = z.infer<typeof GetTeacherClassesWithCountsOutput>;
