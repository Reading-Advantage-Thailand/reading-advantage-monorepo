import { z } from 'zod';
import { LessonContentSchema } from '@/lib/schemas/lesson-content.schema';

/**
 * Schema for individual quiz question data in seed files
 */
export const SeedQuizQuestionSchema = z.object({
  slug: z.string().optional(),
  type: z.string().min(1, 'Question type is required'),
  text: z.string().min(1, 'Question text is required'),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  points: z.number().int().positive('Points must be a positive integer'),
  standards: z.array(z.string()).min(1, 'At least one standard is required'),
});

/**
 * Schema for a quiz questions seed file
 */
export const SeedQuizQuestionsFileSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  questions: z.array(SeedQuizQuestionSchema).min(1, 'At least one question is required'),
});

/**
 * Schema for a single lesson within a lessons seed file
 */
export const SeedLessonSchema = z.object({
  id: z.string().min(1, 'Lesson ID is required'),
  slug: z.string().optional(),
  title: z.string().min(1, 'Lesson title is required'),
  description: z.string().min(1, 'Lesson description is required'),
  content: z.string().min(1, 'Lesson content is required'),
  lessonType: z.string().optional(),
  order: z.number().int().positive('Order must be a positive integer'),
  standards: z.array(z.string()),
  structuredContent: z
    .object({
      version: z.literal(1),
      blocks: z.array(z.unknown()),
    })
    .optional(),
});

/**
 * Schema for a lessons seed file
 */
export const SeedLessonsFileSchema = z.object({
  framework: z.string().min(1, 'Framework is required'),
  gradeLevel: z.number().int().positive('Grade level must be a positive integer'),
  unit: z.number().int().positive('Unit must be a positive integer'),
  lessons: z.array(SeedLessonSchema).min(1, 'At least one lesson is required'),
});

export type SeedQuizQuestion = z.infer<typeof SeedQuizQuestionSchema>;
export type SeedQuizQuestionsFile = z.infer<typeof SeedQuizQuestionsFileSchema>;
export type SeedLesson = z.infer<typeof SeedLessonSchema>;
export type SeedLessonsFile = z.infer<typeof SeedLessonsFileSchema>;

/**
 * Error details for a validation failure
 */
export interface ValidationError {
  filePath: string;
  lessonId?: string;
  field?: string;
  message: string;
}

/**
 * Validate a lessons seed file using Zod schemas
 *
 * @param data - The parsed JSON data from the lessons file
 * @param filePath - The path to the file being validated (for error reporting)
 * @returns Array of validation errors (empty if valid)
 */
export function validateLessonsSeedFile(
  data: unknown,
  filePath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // First validate the file structure
  const fileResult = SeedLessonsFileSchema.safeParse(data);
  if (!fileResult.success) {
    for (const issue of fileResult.error.issues) {
      errors.push({
        filePath,
        field: issue.path.join('.'),
        message: issue.message,
      });
    }
    return errors;
  }

  // Then validate each lesson's structuredContent against the LessonContentSchema
  for (const lesson of fileResult.data.lessons) {
    if (lesson.structuredContent) {
      const contentResult = LessonContentSchema.safeParse(lesson.structuredContent);
      if (!contentResult.success) {
        for (const issue of contentResult.error.issues) {
          errors.push({
            filePath,
            lessonId: lesson.id,
            field: `structuredContent.${issue.path.join('.')}`,
            message: issue.message,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate a quiz questions seed file using Zod schemas
 *
 * @param data - The parsed JSON data from the questions file
 * @param filePath - The path to the file being validated (for error reporting)
 * @returns Array of validation errors (empty if valid)
 */
export function validateQuizQuestionsSeedFile(
  data: unknown,
  filePath: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  const fileResult = SeedQuizQuestionsFileSchema.safeParse(data);
  if (!fileResult.success) {
    for (const issue of fileResult.error.issues) {
      errors.push({
        filePath,
        field: issue.path.join('.'),
        message: issue.message,
      });
    }
  }

  return errors;
}

/**
 * Format validation errors into a human-readable string
 *
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return '';

  const lines = errors.map((err) => {
    const parts = [`File: ${err.filePath}`];
    if (err.lessonId) parts.push(`Lesson: ${err.lessonId}`);
    if (err.field) parts.push(`Field: ${err.field}`);
    parts.push(`Error: ${err.message}`);
    return `  - ${parts.join(' | ')}`;
  });

  return `Validation failed with ${errors.length} error(s):\n${lines.join('\n')}`;
}
