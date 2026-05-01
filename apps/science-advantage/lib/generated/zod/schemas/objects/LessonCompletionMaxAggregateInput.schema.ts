import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  studentId: z.literal(true).optional(),
  lessonId: z.literal(true).optional(),
  status: z.literal(true).optional(),
  completedAt: z.literal(true).optional(),
  attemptsCount: z.literal(true).optional(),
  bestScore: z.literal(true).optional(),
  bestScorePercentage: z.literal(true).optional(),
  mostRecentScore: z.literal(true).optional(),
  mostRecentScorePercentage: z.literal(true).optional(),
  totalTimeSpentSeconds: z.literal(true).optional(),
  lastAttemptAt: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const LessonCompletionMaxAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionMaxAggregateInputType>;
export const LessonCompletionMaxAggregateInputObjectZodSchema = makeSchema();
