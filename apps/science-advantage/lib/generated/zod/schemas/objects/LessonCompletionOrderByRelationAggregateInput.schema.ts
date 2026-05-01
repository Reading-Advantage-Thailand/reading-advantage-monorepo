import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const LessonCompletionOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.LessonCompletionOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionOrderByRelationAggregateInput>;
export const LessonCompletionOrderByRelationAggregateInputObjectZodSchema = makeSchema();
