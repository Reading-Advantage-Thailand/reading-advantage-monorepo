import * as z from 'zod';
export const StandardUpdateResultSchema = z.nullable(z.object({
  id: z.string(),
  framework: z.unknown(),
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional(),
  lessons: z.array(z.unknown()),
  quizQuestions: z.array(z.unknown()),
  masteryRecords: z.array(z.unknown())
}));