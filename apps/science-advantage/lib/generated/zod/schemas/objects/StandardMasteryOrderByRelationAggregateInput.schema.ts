import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const StandardMasteryOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasteryOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryOrderByRelationAggregateInput>;
export const StandardMasteryOrderByRelationAggregateInputObjectZodSchema = makeSchema();
