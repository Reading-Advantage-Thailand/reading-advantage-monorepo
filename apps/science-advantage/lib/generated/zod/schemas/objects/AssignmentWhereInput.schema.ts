import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema';
import { ClassScalarRelationFilterObjectSchema as ClassScalarRelationFilterObjectSchema } from './ClassScalarRelationFilter.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './ClassWhereInput.schema';
import { LessonScalarRelationFilterObjectSchema as LessonScalarRelationFilterObjectSchema } from './LessonScalarRelationFilter.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const assignmentwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AssignmentWhereInputObjectSchema), z.lazy(() => AssignmentWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AssignmentWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AssignmentWhereInputObjectSchema), z.lazy(() => AssignmentWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  classId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  assignedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  dueAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  assignedBy: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  class: z.union([z.lazy(() => ClassScalarRelationFilterObjectSchema), z.lazy(() => ClassWhereInputObjectSchema)]).optional(),
  lesson: z.union([z.lazy(() => LessonScalarRelationFilterObjectSchema), z.lazy(() => LessonWhereInputObjectSchema)]).optional(),
  teacher: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional()
}).strict();
export const AssignmentWhereInputObjectSchema: z.ZodType<Prisma.AssignmentWhereInput> = assignmentwhereinputSchema as unknown as z.ZodType<Prisma.AssignmentWhereInput>;
export const AssignmentWhereInputObjectZodSchema = assignmentwhereinputSchema;
