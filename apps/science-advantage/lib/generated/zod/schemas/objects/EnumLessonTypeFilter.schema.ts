import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { NestedEnumLessonTypeFilterObjectSchema as NestedEnumLessonTypeFilterObjectSchema } from './NestedEnumLessonTypeFilter.schema'

const makeSchema = () => z.object({
  equals: LessonTypeSchema.optional(),
  in: LessonTypeSchema.array().optional(),
  notIn: LessonTypeSchema.array().optional(),
  not: z.union([LessonTypeSchema, z.lazy(() => NestedEnumLessonTypeFilterObjectSchema)]).optional()
}).strict();
export const EnumLessonTypeFilterObjectSchema: z.ZodType<Prisma.EnumLessonTypeFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumLessonTypeFilter>;
export const EnumLessonTypeFilterObjectZodSchema = makeSchema();
