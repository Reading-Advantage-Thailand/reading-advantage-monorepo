import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional()
}).strict();
export const StandardSumAggregateInputObjectSchema: z.ZodType<Prisma.StandardSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardSumAggregateInputType>;
export const StandardSumAggregateInputObjectZodSchema = makeSchema();
