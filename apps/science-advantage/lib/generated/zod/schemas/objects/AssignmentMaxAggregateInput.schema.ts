import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  classId: z.literal(true).optional(),
  lessonId: z.literal(true).optional(),
  assignedAt: z.literal(true).optional(),
  dueAt: z.literal(true).optional(),
  assignedBy: z.literal(true).optional(),
  createdAt: z.literal(true).optional()
}).strict();
export const AssignmentMaxAggregateInputObjectSchema: z.ZodType<Prisma.AssignmentMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentMaxAggregateInputType>;
export const AssignmentMaxAggregateInputObjectZodSchema = makeSchema();
