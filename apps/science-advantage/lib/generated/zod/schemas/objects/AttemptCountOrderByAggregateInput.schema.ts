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
export const AttemptCountOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AttemptCountOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCountOrderByAggregateInput>;
export const AttemptCountOrderByAggregateInputObjectZodSchema = makeSchema();
