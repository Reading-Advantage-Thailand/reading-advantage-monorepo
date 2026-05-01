import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional()
}).strict();
export const ClassSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.ClassSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassSumOrderByAggregateInput>;
export const ClassSumOrderByAggregateInputObjectZodSchema = makeSchema();
