import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const QuizQuestionOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionOrderByRelationAggregateInput>;
export const QuizQuestionOrderByRelationAggregateInputObjectZodSchema = makeSchema();
