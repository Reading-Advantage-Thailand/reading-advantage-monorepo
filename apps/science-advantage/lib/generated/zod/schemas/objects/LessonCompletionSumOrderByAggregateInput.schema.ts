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
export const LessonCompletionSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionSumOrderByAggregateInput>;
export const LessonCompletionSumOrderByAggregateInputObjectZodSchema = makeSchema();
