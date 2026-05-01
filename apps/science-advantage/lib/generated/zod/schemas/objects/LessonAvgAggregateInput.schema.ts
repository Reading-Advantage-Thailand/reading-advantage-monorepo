import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional(),
  order: z.literal(true).optional()
}).strict();
export const LessonAvgAggregateInputObjectSchema: z.ZodType<Prisma.LessonAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.LessonAvgAggregateInputType>;
export const LessonAvgAggregateInputObjectZodSchema = makeSchema();
