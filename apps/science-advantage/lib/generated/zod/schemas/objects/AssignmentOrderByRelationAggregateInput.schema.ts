import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const AssignmentOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.AssignmentOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentOrderByRelationAggregateInput>;
export const AssignmentOrderByRelationAggregateInputObjectZodSchema = makeSchema();
