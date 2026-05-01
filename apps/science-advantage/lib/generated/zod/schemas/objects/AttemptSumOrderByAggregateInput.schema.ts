import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  score: SortOrderSchema.optional(),
  maxScore: SortOrderSchema.optional(),
  attemptNumber: SortOrderSchema.optional()
}).strict();
export const AttemptSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.AttemptSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptSumOrderByAggregateInput>;
export const AttemptSumOrderByAggregateInputObjectZodSchema = makeSchema();
