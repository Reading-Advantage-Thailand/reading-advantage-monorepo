import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const userOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.userOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.userOrderByRelationAggregateInput>;
export const userOrderByRelationAggregateInputObjectZodSchema = makeSchema();
