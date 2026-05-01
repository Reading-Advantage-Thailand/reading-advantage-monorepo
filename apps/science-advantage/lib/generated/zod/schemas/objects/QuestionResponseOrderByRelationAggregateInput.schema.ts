import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const QuestionResponseOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.QuestionResponseOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseOrderByRelationAggregateInput>;
export const QuestionResponseOrderByRelationAggregateInputObjectZodSchema = makeSchema();
