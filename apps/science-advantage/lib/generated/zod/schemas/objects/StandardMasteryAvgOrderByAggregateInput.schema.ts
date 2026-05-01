import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  masteryLevel: SortOrderSchema.optional(),
  evidenceCount: SortOrderSchema.optional()
}).strict();
export const StandardMasteryAvgOrderByAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasteryAvgOrderByAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryAvgOrderByAggregateInput>;
export const StandardMasteryAvgOrderByAggregateInputObjectZodSchema = makeSchema();
