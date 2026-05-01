import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { StringNullableWithAggregatesFilterObjectSchema as StringNullableWithAggregatesFilterObjectSchema } from './StringNullableWithAggregatesFilter.schema';
import { JsonNullableWithAggregatesFilterObjectSchema as JsonNullableWithAggregatesFilterObjectSchema } from './JsonNullableWithAggregatesFilter.schema';
import { EnumLessonTypeWithAggregatesFilterObjectSchema as EnumLessonTypeWithAggregatesFilterObjectSchema } from './EnumLessonTypeWithAggregatesFilter.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const lessonscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => LessonScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => LessonScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => LessonScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => LessonScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => LessonScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  titleThai: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  description: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  descriptionThai: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  content: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  structuredContent: z.lazy(() => JsonNullableWithAggregatesFilterObjectSchema).optional(),
  lessonType: z.union([z.lazy(() => EnumLessonTypeWithAggregatesFilterObjectSchema), LessonTypeSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const LessonScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.LessonScalarWhereWithAggregatesInput> = lessonscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.LessonScalarWhereWithAggregatesInput>;
export const LessonScalarWhereWithAggregatesInputObjectZodSchema = lessonscalarwherewithaggregatesinputSchema;
