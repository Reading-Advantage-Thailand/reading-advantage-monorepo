import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { NestedEnumLessonTypeWithAggregatesFilterObjectSchema as NestedEnumLessonTypeWithAggregatesFilterObjectSchema } from './NestedEnumLessonTypeWithAggregatesFilter.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumLessonTypeFilterObjectSchema as NestedEnumLessonTypeFilterObjectSchema } from './NestedEnumLessonTypeFilter.schema'

const makeSchema = () => z.object({
  equals: LessonTypeSchema.optional(),
  in: LessonTypeSchema.array().optional(),
  notIn: LessonTypeSchema.array().optional(),
  not: z.union([LessonTypeSchema, z.lazy(() => NestedEnumLessonTypeWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumLessonTypeFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumLessonTypeFilterObjectSchema).optional()
}).strict();
export const EnumLessonTypeWithAggregatesFilterObjectSchema: z.ZodType<Prisma.EnumLessonTypeWithAggregatesFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonTypeWithAggregatesFilter>;
export const EnumLessonTypeWithAggregatesFilterObjectZodSchema = makeSchema();
