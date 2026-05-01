import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  attemptsCount: z.literal(true).optional(),
  bestScore: z.literal(true).optional(),
  bestScorePercentage: z.literal(true).optional(),
  mostRecentScore: z.literal(true).optional(),
  mostRecentScorePercentage: z.literal(true).optional(),
  totalTimeSpentSeconds: z.literal(true).optional()
}).strict();
export const LessonCompletionAvgAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionAvgAggregateInputType>;
export const LessonCompletionAvgAggregateInputObjectZodSchema = makeSchema();
