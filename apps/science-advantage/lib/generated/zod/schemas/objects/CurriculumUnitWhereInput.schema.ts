import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { LessonListRelationFilterObjectSchema as LessonListRelationFilterObjectSchema } from './LessonListRelationFilter.schema';
import { ClassScalarRelationFilterObjectSchema as ClassScalarRelationFilterObjectSchema } from './ClassScalarRelationFilter.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema'

const curriculumunitwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => CurriculumUnitWhereInputObjectSchema), z.lazy(() => CurriculumUnitWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => CurriculumUnitWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => CurriculumUnitWhereInputObjectSchema), z.lazy(() => CurriculumUnitWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  classId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  lessons: z.lazy(() => LessonListRelationFilterObjectSchema).optional(),
  class: z.union([z.lazy(() => ClassScalarRelationFilterObjectSchema), z.lazy(() => ClassWhereInputObjectSchema)]).optional()
}).strict();
export const CurriculumUnitWhereInputObjectSchema: z.ZodType<Prisma.CurriculumUnitWhereInput> = curriculumunitwhereinputSchema as unknown as z.ZodType<Prisma.CurriculumUnitWhereInput>;
export const CurriculumUnitWhereInputObjectZodSchema = curriculumunitwhereinputSchema;
