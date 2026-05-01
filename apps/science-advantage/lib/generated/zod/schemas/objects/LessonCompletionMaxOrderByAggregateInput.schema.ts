import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  status: SortOrderSchema.optional(),
  completedAt: SortOrderSchema.optional(),
  attemptsCount: SortOrderSchema.optional(),
  bestScore: SortOrderSchema.optional(),
  bestScorePercentage: SortOrderSchema.optional(),
  mostRecentScore: SortOrderSchema.optional(),
  mostRecentScorePercentage: SortOrderSchema.optional(),
  totalTimeSpentSeconds: SortOrderSchema.optional(),
  lastAttemptAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const LessonCompletionMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionMaxOrderByAggregateInput>;
export const LessonCompletionMaxOrderByAggregateInputObjectZodSchema = makeSchema();
