import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId: z.string(),
  lessonId: z.string(),
  score: z.number().optional(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const AttemptCreateManyInputObjectSchema: z.ZodType<Prisma.AttemptCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateManyInput>;
export const AttemptCreateManyInputObjectZodSchema = makeSchema();
