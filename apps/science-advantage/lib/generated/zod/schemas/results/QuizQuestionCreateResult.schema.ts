import * as z from 'zod';
export const QuizQuestionCreateResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
  lessonId: z.string(),
  type: z.unknown(),
  text: z.string(),
  options: z.unknown().optional(),
  correctAnswer: z.unknown(),
  points: z.number().int(),
  order: z.number().int(),
  version: z.number().int(),
  lesson: z.unknown(),
  standards: z.array(z.unknown()),
  responses: z.array(z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date()
});