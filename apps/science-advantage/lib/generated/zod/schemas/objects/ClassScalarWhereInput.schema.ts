import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const classscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => ClassScalarWhereInputObjectSchema), z.lazy(() => ClassScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => ClassScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => ClassScalarWhereInputObjectSchema), z.lazy(() => ClassScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  standardsAlignment: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  joinCode: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  teacherId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const ClassScalarWhereInputObjectSchema: z.ZodType<Prisma.ClassScalarWhereInput> = classscalarwhereinputSchema as unknown as z.ZodType<Prisma.ClassScalarWhereInput>;
export const ClassScalarWhereInputObjectZodSchema = classscalarwhereinputSchema;
