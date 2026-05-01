import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { StringNullableWithAggregatesFilterObjectSchema as StringNullableWithAggregatesFilterObjectSchema } from './StringNullableWithAggregatesFilter.schema';
import { EnumStandardsAlignmentWithAggregatesFilterObjectSchema as EnumStandardsAlignmentWithAggregatesFilterObjectSchema } from './EnumStandardsAlignmentWithAggregatesFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const curriculumunitscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => CurriculumUnitScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => CurriculumUnitScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => CurriculumUnitScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => CurriculumUnitScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentWithAggregatesFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  classId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const CurriculumUnitScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.CurriculumUnitScalarWhereWithAggregatesInput> = curriculumunitscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.CurriculumUnitScalarWhereWithAggregatesInput>;
export const CurriculumUnitScalarWhereWithAggregatesInputObjectZodSchema = curriculumunitscalarwherewithaggregatesinputSchema;
