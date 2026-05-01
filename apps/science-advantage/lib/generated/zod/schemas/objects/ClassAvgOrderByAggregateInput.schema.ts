import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional()
}).strict();
export const ClassAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.ClassAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassAvgOrderByAggregateInput>;
export const ClassAvgOrderByAggregateInputObjectZodSchema = makeSchema();
