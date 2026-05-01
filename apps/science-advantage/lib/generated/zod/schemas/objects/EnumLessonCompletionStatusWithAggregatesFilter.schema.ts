import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { NestedEnumLessonCompletionStatusWithAggregatesFilterObjectSchema as NestedEnumLessonCompletionStatusWithAggregatesFilterObjectSchema } from './NestedEnumLessonCompletionStatusWithAggregatesFilter.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumLessonCompletionStatusFilterObjectSchema as NestedEnumLessonCompletionStatusFilterObjectSchema } from './NestedEnumLessonCompletionStatusFilter.schema'

const makeSchema = () => z.object({
  equals: LessonCompletionStatusSchema.optional(),
  in: LessonCompletionStatusSchema.array().optional(),
  notIn: LessonCompletionStatusSchema.array().optional(),
  not: z.union([LessonCompletionStatusSchema, z.lazy(() => NestedEnumLessonCompletionStatusWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema).optional()
}).strict();
export const EnumLessonCompletionStatusWithAggregatesFilterObjectSchema: z.ZodType<Prisma.EnumLessonCompletionStatusWithAggregatesFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonCompletionStatusWithAggregatesFilter>;
export const EnumLessonCompletionStatusWithAggregatesFilterObjectZodSchema = makeSchema();
