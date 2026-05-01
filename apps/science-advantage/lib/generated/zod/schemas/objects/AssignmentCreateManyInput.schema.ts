import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  classId: z.string(),
  lessonId: z.string(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assignedBy: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();
export const AssignmentCreateManyInputObjectSchema: z.ZodType<Prisma.AssignmentCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateManyInput>;
export const AssignmentCreateManyInputObjectZodSchema = makeSchema();
