import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  attemptsCount: SortOrderSchema.optional(),
  bestScore: SortOrderSchema.optional(),
  bestScorePercentage: SortOrderSchema.optional(),
  mostRecentScore: SortOrderSchema.optional(),
  mostRecentScorePercentage: SortOrderSchema.optional(),
  totalTimeSpentSeconds: SortOrderSchema.optional()
}).strict();
export const LessonCompletionAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionAvgOrderByAggregateInput>;
export const LessonCompletionAvgOrderByAggregateInputObjectZodSchema = makeSchema();
