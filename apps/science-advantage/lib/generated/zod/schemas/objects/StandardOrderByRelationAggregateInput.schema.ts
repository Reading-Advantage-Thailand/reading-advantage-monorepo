import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const StandardOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.StandardOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardOrderByRelationAggregateInput>;
export const StandardOrderByRelationAggregateInputObjectZodSchema = makeSchema();
