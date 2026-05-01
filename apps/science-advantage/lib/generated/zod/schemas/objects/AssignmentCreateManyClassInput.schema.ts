import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  lessonId: z.string(),
  assignedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional().nullable(),
  assignedBy: z.string(),
  createdAt: z.coerce.date().optional()
}).strict();
export const AssignmentCreateManyClassInputObjectSchema: z.ZodType<Prisma.AssignmentCreateManyClassInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateManyClassInput>;
export const AssignmentCreateManyClassInputObjectZodSchema = makeSchema();
