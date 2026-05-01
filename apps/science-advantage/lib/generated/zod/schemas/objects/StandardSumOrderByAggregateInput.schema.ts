import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional()
}).strict();
export const StandardSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.StandardSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardSumOrderByAggregateInput>;
export const StandardSumOrderByAggregateInputObjectZodSchema = makeSchema();
