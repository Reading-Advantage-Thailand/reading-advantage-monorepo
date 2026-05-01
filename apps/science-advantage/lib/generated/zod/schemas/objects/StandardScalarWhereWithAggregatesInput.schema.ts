import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { EnumStandardsAlignmentWithAggregatesFilterObjectSchema as EnumStandardsAlignmentWithAggregatesFilterObjectSchema } from './EnumStandardsAlignmentWithAggregatesFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntNullableWithAggregatesFilterObjectSchema as IntNullableWithAggregatesFilterObjectSchema } from './IntNullableWithAggregatesFilter.schema'

const standardscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => StandardScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => StandardScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentWithAggregatesFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  code: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntNullableWithAggregatesFilterObjectSchema), z.number().int()]).optional().nullable()
}).strict();
export const StandardScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.StandardScalarWhereWithAggregatesInput> = standardscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.StandardScalarWhereWithAggregatesInput>;
export const StandardScalarWhereWithAggregatesInputObjectZodSchema = standardscalarwherewithaggregatesinputSchema;
