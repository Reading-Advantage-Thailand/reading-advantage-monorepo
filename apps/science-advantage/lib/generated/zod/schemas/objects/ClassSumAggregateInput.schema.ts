import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional()
}).strict();
export const ClassSumAggregateInputObjectSchema: z.ZodType<Prisma.ClassSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.ClassSumAggregateInputType>;
export const ClassSumAggregateInputObjectZodSchema = makeSchema();
