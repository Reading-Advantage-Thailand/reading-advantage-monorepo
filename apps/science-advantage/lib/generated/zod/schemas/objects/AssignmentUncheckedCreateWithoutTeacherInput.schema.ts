import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  classId: z.string(),
  lessonId: z.string(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();
export const AssignmentUncheckedCreateWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentUncheckedCreateWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUncheckedCreateWithoutTeacherInput>;
export const AssignmentUncheckedCreateWithoutTeacherInputObjectZodSchema = makeSchema();
