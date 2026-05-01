import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { EnumStandardsAlignmentWithAggregatesFilterObjectSchema as EnumStandardsAlignmentWithAggregatesFilterObjectSchema } from './EnumStandardsAlignmentWithAggregatesFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const classscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => ClassScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => ClassScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => ClassScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => ClassScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => ClassScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string().min(3).max(100).trim()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int().int().min(3).max(6)]).optional(),
  standardsAlignment: z.union([z.lazy(() => EnumStandardsAlignmentWithAggregatesFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  joinCode: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  teacherId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const ClassScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.ClassScalarWhereWithAggregatesInput> = classscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.ClassScalarWhereWithAggregatesInput>;
export const ClassScalarWhereWithAggregatesInputObjectZodSchema = classscalarwherewithaggregatesinputSchema;
