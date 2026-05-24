import { z } from 'zod';

/**
 * Hand-written replacement for the previously Prisma-generated
 * `ClassModelSchema.pick({ id, name, gradeLevel, teacherId })`. Constraints
 * mirror the original Prisma model exactly:
 *   id           string (cuid/uuid — kept as raw string, matching prior shape)
 *   name         string, 3–100 chars, trimmed
 *   gradeLevel   integer, 3–6 inclusive
 *   teacherId    string
 *
 * Track 3 (prisma_drizzle_science_controllers_20260505) removes the
 * `lib/generated/zod/` dependency.
 */

const studentClassBaseSchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().min(3).max(6),
  teacherId: z.string(),
});

export const studentEnrolledClassSchema = studentClassBaseSchema.extend({
  teacherName: z
    .string({
      required_error: 'Teacher name is required',
    })
    .min(1, 'Teacher name is required'),
  enrolledAt: z
    .string({
      required_error: 'Enrollment timestamp is required',
    })
    .datetime(),
});

export type StudentEnrolledClass = z.infer<typeof studentEnrolledClassSchema>;

export const studentEnrolledClassesResponseSchema = z.object({
  classes: z.array(studentEnrolledClassSchema),
});

export type StudentEnrolledClassesResponse = z.infer<
  typeof studentEnrolledClassesResponseSchema
>;
