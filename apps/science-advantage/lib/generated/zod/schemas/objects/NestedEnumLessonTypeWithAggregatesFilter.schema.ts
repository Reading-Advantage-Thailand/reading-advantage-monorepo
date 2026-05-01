import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumLessonTypeFilterObjectSchema as NestedEnumLessonTypeFilterObjectSchema } from './NestedEnumLessonTypeFilter.schema'

const nestedenumlessontypewithaggregatesfilterSchema = z.object({
  equals: LessonTypeSchema.optional(),
  in: LessonTypeSchema.array().optional(),
  notIn: LessonTypeSchema.array().optional(),
  not: z.union([LessonTypeSchema, z.lazy(() => NestedEnumLessonTypeWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumLessonTypeFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumLessonTypeFilterObjectSchema).optional()
}).strict();
export const NestedEnumLessonTypeWithAggregatesFilterObjectSchema: z.ZodType<Prisma.NestedEnumLessonTypeWithAggregatesFilter> = nestedenumlessontypewithaggregatesfilterSchema as unknown as z.ZodType<Prisma.NestedEnumLessonTypeWithAggregatesFilter>;
export const NestedEnumLessonTypeWithAggregatesFilterObjectZodSchema = nestedenumlessontypewithaggregatesfilterSchema;
