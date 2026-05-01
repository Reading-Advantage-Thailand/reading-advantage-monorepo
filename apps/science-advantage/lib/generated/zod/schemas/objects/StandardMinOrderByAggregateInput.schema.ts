import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  id: SortOrderSchema.optional(),
  framework: SortOrderSchema.optional(),
  code: SortOrderSchema.optional(),
  description: SortOrderSchema.optional(),
  gradeLevel: SortOrderSchema.optional()
}).strict();
export const StandardMinOrderByAggregateInputObjectSchema: z.ZodType<Prisma.StandardMinOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMinOrderByAggregateInput>;
export const StandardMinOrderByAggregateInputObjectZodSchema = makeSchema();
