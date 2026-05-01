import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  score: SortOrderSchema.optional(),
  maxScore: SortOrderSchema.optional(),
  attemptNumber: SortOrderSchema.optional()
}).strict();
export const AttemptAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AttemptAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptAvgOrderByAggregateInput>;
export const AttemptAvgOrderByAggregateInputObjectZodSchema = makeSchema();
