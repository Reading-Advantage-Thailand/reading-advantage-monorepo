import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateNestedOneWithoutAssignmentsInputObjectSchema as ClassCreateNestedOneWithoutAssignmentsInputObjectSchema } from './ClassCreateNestedOneWithoutAssignmentsInput.schema';
import { LessonCreateNestedOneWithoutAssignmentsInputObjectSchema as LessonCreateNestedOneWithoutAssignmentsInputObjectSchema } from './LessonCreateNestedOneWithoutAssignmentsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  class: z.lazy(() => ClassCreateNestedOneWithoutAssignmentsInputObjectSchema),
  lesson: z.lazy(() => LessonCreateNestedOneWithoutAssignmentsInputObjectSchema)
}).strict();
export const AssignmentCreateWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentCreateWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateWithoutTeacherInput>;
export const AssignmentCreateWithoutTeacherInputObjectZodSchema = makeSchema();
