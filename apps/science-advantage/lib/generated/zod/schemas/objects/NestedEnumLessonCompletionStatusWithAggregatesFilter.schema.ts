import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumLessonCompletionStatusFilterObjectSchema as NestedEnumLessonCompletionStatusFilterObjectSchema } from './NestedEnumLessonCompletionStatusFilter.schema'

const nestedenumlessoncompletionstatuswithaggregatesfilterSchema = z.object({
  equals: LessonCompletionStatusSchema.optional(),
  in: LessonCompletionStatusSchema.array().optional(),
  notIn: LessonCompletionStatusSchema.array().optional(),
  not: z.union([LessonCompletionStatusSchema, z.lazy(() => NestedEnumLessonCompletionStatusWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumLessonCompletionStatusFilterObjectSchema).optional()
}).strict();
export const NestedEnumLessonCompletionStatusWithAggregatesFilterObjectSchema: z.ZodType<Prisma.NestedEnumLessonCompletionStatusWithAggregatesFilter> = nestedenumlessoncompletionstatuswithaggregatesfilterSchema as unknown as z.ZodType<Prisma.NestedEnumLessonCompletionStatusWithAggregatesFilter>;
export const NestedEnumLessonCompletionStatusWithAggregatesFilterObjectZodSchema = nestedenumlessoncompletionstatuswithaggregatesfilterSchema;
