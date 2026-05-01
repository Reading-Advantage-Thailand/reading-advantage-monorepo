import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonTypeSchema } from '../enums/LessonType.schema'

const nestedenumlessontypefilterSchema = z.object({
  equals: LessonTypeSchema.optional(),
  in: LessonTypeSchema.array().optional(),
  notIn: LessonTypeSchema.array().optional(),
  not: z.union([LessonTypeSchema, z.lazy(() => NestedEnumLessonTypeFilterObjectSchema)]).optional()
}).strict();
export const NestedEnumLessonTypeFilterObjectSchema: z.ZodType<Prisma.NestedEnumLessonTypeFilter> = nestedenumlessontypefilterSchema as unknown as z.ZodType<Prisma.NestedEnumLessonTypeFilter>;
export const NestedEnumLessonTypeFilterObjectZodSchema = nestedenumlessontypefilterSchema;
