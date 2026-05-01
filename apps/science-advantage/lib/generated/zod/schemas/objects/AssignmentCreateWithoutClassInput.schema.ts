import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCreateNestedOneWithoutAssignmentsInputObjectSchema as LessonCreateNestedOneWithoutAssignmentsInputObjectSchema } from './LessonCreateNestedOneWithoutAssignmentsInput.schema';
import { userCreateNestedOneWithoutAssignedLessonsInputObjectSchema as userCreateNestedOneWithoutAssignedLessonsInputObjectSchema } from './userCreateNestedOneWithoutAssignedLessonsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  lesson: z.lazy(() => LessonCreateNestedOneWithoutAssignmentsInputObjectSchema),
  teacher: z.lazy(() => userCreateNestedOneWithoutAssignedLessonsInputObjectSchema)
}).strict();
export const AssignmentCreateWithoutClassInputObjectSchema: z.ZodType<Prisma.AssignmentCreateWithoutClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateWithoutClassInput>;
export const AssignmentCreateWithoutClassInputObjectZodSchema = makeSchema();
