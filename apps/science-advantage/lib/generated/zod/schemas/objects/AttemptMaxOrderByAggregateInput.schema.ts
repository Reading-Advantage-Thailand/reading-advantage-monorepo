import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  studentId: SortOrderSchema.optional(),
  lessonId: SortOrderSchema.optional(),
  score: SortOrderSchema.optional(),
  maxScore: SortOrderSchema.optional(),
  attemptNumber: SortOrderSchema.optional(),
  startedAt: SortOrderSchema.optional(),
  completedAt: SortOrderSchema.optional(),
  createdAt: SortOrderSchema.optional(),
  updatedAt: SortOrderSchema.optional()
}).strict();
export const AttemptMaxOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AttemptMaxOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptMaxOrderByAggregateInput>;
export const AttemptMaxOrderByAggregateInputObjectZodSchema = makeSchema();
