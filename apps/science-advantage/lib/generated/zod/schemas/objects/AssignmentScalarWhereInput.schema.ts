import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema'

const assignmentscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AssignmentScalarWhereInputObjectSchema), z.lazy(() => AssignmentScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AssignmentScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AssignmentScalarWhereInputObjectSchema), z.lazy(() => AssignmentScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  classId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  assignedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  dueAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  assignedBy: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const AssignmentScalarWhereInputObjectSchema: z.ZodType<Prisma.AssignmentScalarWhereInput> = assignmentscalarwhereinputSchema as unknown as z.ZodType<Prisma.AssignmentScalarWhereInput>;
export const AssignmentScalarWhereInputObjectZodSchema = assignmentscalarwhereinputSchema;
