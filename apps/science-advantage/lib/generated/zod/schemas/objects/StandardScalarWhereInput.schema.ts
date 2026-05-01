import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntNullableFilterObjectSchema as IntNullableFilterObjectSchema } from './IntNullableFilter.schema'

const standardscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardScalarWhereInputObjectSchema), z.lazy(() => StandardScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardScalarWhereInputObjectSchema), z.lazy(() => StandardScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  code: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntNullableFilterObjectSchema), z.number().int()]).optional().nullable()
}).strict();
export const StandardScalarWhereInputObjectSchema: z.ZodType<Prisma.StandardScalarWhereInput> = standardscalarwhereinputSchema as unknown as z.ZodType<Prisma.StandardScalarWhereInput>;
export const StandardScalarWhereInputObjectZodSchema = standardscalarwhereinputSchema;
