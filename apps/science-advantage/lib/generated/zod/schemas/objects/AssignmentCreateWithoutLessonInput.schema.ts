import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateNestedOneWithoutAssignmentsInputObjectSchema as ClassCreateNestedOneWithoutAssignmentsInputObjectSchema } from './ClassCreateNestedOneWithoutAssignmentsInput.schema';
import { userCreateNestedOneWithoutAssignedLessonsInputObjectSchema as userCreateNestedOneWithoutAssignedLessonsInputObjectSchema } from './userCreateNestedOneWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  class: z.lazy(() => ClassCreateNestedOneWithoutAssignmentsInputObjectSchema),
  teacher: z.lazy(() => userCreateNestedOneWithoutAssignedLessonsInputObjectSchema)
}).strict();
export const AssignmentCreateWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentCreateWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateWithoutLessonInput>;
export const AssignmentCreateWithoutLessonInputObjectZodSchema = makeSchema();
