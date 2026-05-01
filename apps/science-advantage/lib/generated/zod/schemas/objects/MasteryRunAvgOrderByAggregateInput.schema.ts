import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  updatedCount: SortOrderSchema.optional()
}).strict();
export const MasteryRunAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunAvgOrderByAggregateInput>;
export const MasteryRunAvgOrderByAggregateInputObjectZodSchema = makeSchema();
