import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  gradeLevel: SortOrderSchema.optional(),
  order: SortOrderSchema.optional()
}).strict();
export const CurriculumUnitSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitSumOrderByAggregateInput>;
export const CurriculumUnitSumOrderByAggregateInputObjectZodSchema = makeSchema();
