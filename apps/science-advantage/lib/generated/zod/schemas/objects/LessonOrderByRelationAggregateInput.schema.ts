import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const LessonOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.LessonOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonOrderByRelationAggregateInput>;
export const LessonOrderByRelationAggregateInputObjectZodSchema = makeSchema();
