import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const LessonSumAggregateInputObjectSchema: z.ZodType<Prisma.LessonSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.LessonSumAggregateInputType>;
export const LessonSumAggregateInputObjectZodSchema = makeSchema();
