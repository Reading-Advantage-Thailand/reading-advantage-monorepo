import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  slug: z.literal(true).optional(),
  lessonId: z.literal(true).optional(),
  type: z.literal(true).optional(),
  text: z.literal(true).optional(),
  points: z.literal(true).optional(),
  order: z.literal(true).optional(),
  version: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const QuizQuestionMinAggregateInputObjectSchema: z.ZodType<Prisma.QuizQuestionMinAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionMinAggregateInputType>;
export const QuizQuestionMinAggregateInputObjectZodSchema = makeSchema();
