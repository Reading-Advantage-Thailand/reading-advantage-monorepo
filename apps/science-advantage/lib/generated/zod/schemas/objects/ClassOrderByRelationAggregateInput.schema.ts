import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const ClassOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.ClassOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassOrderByRelationAggregateInput>;
export const ClassOrderByRelationAggregateInputObjectZodSchema = makeSchema();
