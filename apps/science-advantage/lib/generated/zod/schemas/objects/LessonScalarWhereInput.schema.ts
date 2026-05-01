import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { JsonNullableFilterObjectSchema as JsonNullableFilterObjectSchema } from './JsonNullableFilter.schema';
import { EnumLessonTypeFilterObjectSchema as EnumLessonTypeFilterObjectSchema } from './EnumLessonTypeFilter.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const lessonscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => LessonScalarWhereInputObjectSchema), z.lazy(() => LessonScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => LessonScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => LessonScalarWhereInputObjectSchema), z.lazy(() => LessonScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  titleThai: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  description: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  descriptionThai: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  content: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  structuredContent: z.lazy(() => JsonNullableFilterObjectSchema).optional(),
  lessonType: z.union([z.lazy(() => EnumLessonTypeFilterObjectSchema), LessonTypeSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const LessonScalarWhereInputObjectSchema: z.ZodType<Prisma.LessonScalarWhereInput> = lessonscalarwhereinputSchema as unknown as z.ZodType<Prisma.LessonScalarWhereInput>;
export const LessonScalarWhereInputObjectZodSchema = lessonscalarwhereinputSchema;
