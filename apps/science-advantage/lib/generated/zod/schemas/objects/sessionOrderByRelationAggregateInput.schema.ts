import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const sessionOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.sessionOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionOrderByRelationAggregateInput>;
export const sessionOrderByRelationAggregateInputObjectZodSchema = makeSchema();
