import { z } from 'zod';

import { STANDARDS_ALIGNMENT_VALUES } from '@/lib/enums';
import { isValidJoinCodeFormat } from '@/lib/utils/join-code-format';

/**
 * Hand-written replacement for the previously Prisma-generated
 * `ClassCreateInput`/`ClassUpdateInput` Zod schemas. Constraints mirror
 * the original Prisma model exactly:
 *   name               string, 3–100 chars, trimmed
 *   gradeLevel         integer, 3–6 inclusive
 *   standardsAlignment enum from `@/lib/enums`
 *
 * Track 3 (prisma_drizzle_science_controllers_20260505) removes the
 * `lib/generated/zod/` dependency; these schemas preserve the prior
 * validation contract so callers stay unchanged.
 */

const classNameSchema = z.string().min(3).max(100).trim();
const classGradeLevelSchema = z.number().int().min(3).max(6);
const classStandardsAlignmentSchema = z.enum(STANDARDS_ALIGNMENT_VALUES);

/**
 * Server-side validation for creating a class.
 */
export const createClassSchema = z.object({
  name: classNameSchema,
  gradeLevel: classGradeLevelSchema,
  standardsAlignment: classStandardsAlignmentSchema,
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

/**
 * Update schema: restricts to teacher-editable fields. All fields are
 * optional, matching the original Prisma-derived shape.
 */
export const updateClassSchema = z.object({
  name: classNameSchema.optional(),
  gradeLevel: classGradeLevelSchema.optional(),
  standardsAlignment: classStandardsAlignmentSchema.optional(),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

/**
 * Form schema: allows string inputs for numeric fields while piping them
 * through the base validators so client forms stay aligned with the server.
 */
export const createClassFormSchema = z.object({
  name: createClassSchema.shape.name,
  gradeLevel: z.coerce
    .number({
      invalid_type_error: 'Grade level is required',
    })
    .pipe(createClassSchema.shape.gradeLevel),
  standardsAlignment: createClassSchema.shape.standardsAlignment,
});

export type CreateClassFormInput = z.infer<typeof createClassFormSchema>;

/**
 * Validation for student-facing join class flow.
 * Trims whitespace, uppercases the code, and verifies format.
 */
export const joinClassSchema = z.object({
  joinCode: z
    .string({
      required_error: 'Join code is required',
      invalid_type_error: 'Join code must be a string',
    })
    .trim()
    .transform(value => value.toUpperCase())
    .refine(isValidJoinCodeFormat, {
      message: 'Invalid join code format',
    }),
});

export type JoinClassInput = z.infer<typeof joinClassSchema>;
