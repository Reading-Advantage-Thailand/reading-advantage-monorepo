import * as z from 'zod';
export const AttemptUpdateResultSchema = z.nullable(z.object({
  id: z.string(),
  studentId: z.string(),
  lessonId: z.string(),
  score: z.number(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  student: z.unknown(),
  lesson: z.unknown(),
  questionResponses: z.array(z.unknown()),
  masteryRun: z.unknown().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
}));