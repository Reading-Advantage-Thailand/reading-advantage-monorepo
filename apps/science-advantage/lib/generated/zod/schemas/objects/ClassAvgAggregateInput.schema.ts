import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional()
}).strict();
export const ClassAvgAggregateInputObjectSchema: z.ZodType<Prisma.ClassAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.ClassAvgAggregateInputType>;
export const ClassAvgAggregateInputObjectZodSchema = makeSchema();
