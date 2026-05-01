import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId: z.string(),
  score: z.number().optional(),
  maxScore: z.number(),
  attemptNumber: z.number().int(),
  startedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const AttemptCreateManyLessonInputObjectSchema: z.ZodType<Prisma.AttemptCreateManyLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateManyLessonInput>;
export const AttemptCreateManyLessonInputObjectZodSchema = makeSchema();
