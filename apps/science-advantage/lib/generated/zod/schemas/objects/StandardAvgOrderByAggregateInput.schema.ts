import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional()
}).strict();
export const StandardAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.StandardAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardAvgOrderByAggregateInput>;
export const StandardAvgOrderByAggregateInputObjectZodSchema = makeSchema();
