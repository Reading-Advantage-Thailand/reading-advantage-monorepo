import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  studentId: z.literal(true).optional(),
  lessonId: z.literal(true).optional(),
  score: z.literal(true).optional(),
  maxScore: z.literal(true).optional(),
  attemptNumber: z.literal(true).optional(),
  startedAt: z.literal(true).optional(),
  completedAt: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional(),
  _all: z.literal(true).optional()
}).strict();
export const AttemptCountAggregateInputObjectSchema: z.ZodType<Prisma.AttemptCountAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCountAggregateInputType>;
export const AttemptCountAggregateInputObjectZodSchema = makeSchema();
