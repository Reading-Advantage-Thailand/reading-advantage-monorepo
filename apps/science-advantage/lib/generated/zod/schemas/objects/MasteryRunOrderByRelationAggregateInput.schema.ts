import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const MasteryRunOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.MasteryRunOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunOrderByRelationAggregateInput>;
export const MasteryRunOrderByRelationAggregateInputObjectZodSchema = makeSchema();
