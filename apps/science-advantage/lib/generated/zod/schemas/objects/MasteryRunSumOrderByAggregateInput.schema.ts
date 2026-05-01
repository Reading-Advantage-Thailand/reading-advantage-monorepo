import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  updatedCount: SortOrderSchema.optional()
}).strict();
export const MasteryRunSumOrderByAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunSumOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunSumOrderByAggregateInput>;
export const MasteryRunSumOrderByAggregateInputObjectZodSchema = makeSchema();
