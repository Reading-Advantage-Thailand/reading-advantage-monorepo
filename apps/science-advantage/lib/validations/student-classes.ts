import { z } from 'zod';

import { ClassModelSchema } from '@/lib/generated/zod/schemas/variants/pure';

/**
 * Base schema leverages the Prisma-generated `ClassModelSchema`
 * so core fields stay aligned with the underlying data model.
 */
const studentClassBaseSchema = ClassModelSchema.pick({
  id: true,
  name: true,
  gradeLevel: true,
  teacherId: true,
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
