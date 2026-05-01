import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const curriculumunitscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  classId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const CurriculumUnitScalarWhereInputObjectSchema: z.ZodType<Prisma.CurriculumUnitScalarWhereInput> = curriculumunitscalarwhereinputSchema as unknown as z.ZodType<Prisma.CurriculumUnitScalarWhereInput>;
export const CurriculumUnitScalarWhereInputObjectZodSchema = curriculumunitscalarwhereinputSchema;
