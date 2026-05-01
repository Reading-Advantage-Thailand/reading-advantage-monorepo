import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateNestedOneWithoutAssignmentsInputObjectSchema as ClassCreateNestedOneWithoutAssignmentsInputObjectSchema } from './ClassCreateNestedOneWithoutAssignmentsInput.schema';
import { LessonCreateNestedOneWithoutAssignmentsInputObjectSchema as LessonCreateNestedOneWithoutAssignmentsInputObjectSchema } from './LessonCreateNestedOneWithoutAssignmentsInput.schema';
import { userCreateNestedOneWithoutAssignedLessonsInputObjectSchema as userCreateNestedOneWithoutAssignedLessonsInputObjectSchema } from './userCreateNestedOneWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  class: z.lazy(() => ClassCreateNestedOneWithoutAssignmentsInputObjectSchema),
  lesson: z.lazy(() => LessonCreateNestedOneWithoutAssignmentsInputObjectSchema),
  teacher: z.lazy(() => userCreateNestedOneWithoutAssignedLessonsInputObjectSchema)
}).strict();
export const AssignmentCreateInputObjectSchema: z.ZodType<Prisma.AssignmentCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateInput>;
export const AssignmentCreateInputObjectZodSchema = makeSchema();
