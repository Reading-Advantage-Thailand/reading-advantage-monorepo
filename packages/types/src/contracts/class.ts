import { z } from 'zod';

// ─── Standards Alignment ──────────────────────────────────

export const STANDARDS_ALIGNMENT_VALUES = ['THAI', 'NGSS'] as const;
export type StandardsAlignment = (typeof STANDARDS_ALIGNMENT_VALUES)[number];
export const StandardsAlignment = {
  THAI: 'THAI',
  NGSS: 'NGSS',
} as const satisfies Record<StandardsAlignment, StandardsAlignment>;

// ─── Join Code ────────────────────────────────────────────

export const JOIN_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_PATTERN = `[A-HJ-NP-Z2-9]{${JOIN_CODE_LENGTH}}`;

/**
 * Validate join code format against shared constraints.
 */
export function isValidJoinCodeFormat(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  return code.split('').every((char) => JOIN_CODE_CHARSET.includes(char));
}

// ─── Class Schemas ────────────────────────────────────────

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
 * Update schema: restricts to teacher-editable fields.
 */
export const updateClassSchema = z.object({
  name: classNameSchema.optional(),
  gradeLevel: classGradeLevelSchema.optional(),
  standardsAlignment: classStandardsAlignmentSchema.optional(),
});

export type UpdateClassInput = z.infer<typeof updateClassSchema>;

/**
 * Form schema: allows string inputs for numeric fields while piping them
 * through the base validators.
 */
export const createClassFormSchema = z.object({
  name: createClassSchema.shape.name,
  gradeLevel: z.coerce
    .number({ invalid_type_error: 'Grade level is required' })
    .pipe(createClassSchema.shape.gradeLevel),
  standardsAlignment: createClassSchema.shape.standardsAlignment,
});

export type CreateClassFormInput = z.infer<typeof createClassFormSchema>;

/**
 * Validation for student-facing join class flow.
 */
export const joinClassSchema = z.object({
  joinCode: z
    .string({
      required_error: 'Join code is required',
      invalid_type_error: 'Join code must be a string',
    })
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(isValidJoinCodeFormat, { message: 'Invalid join code format' }),
});

export type JoinClassInput = z.infer<typeof joinClassSchema>;
