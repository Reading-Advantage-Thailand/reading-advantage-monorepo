import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  gradeLevel: z.literal(true).optional()
}).strict();
export const StandardAvgAggregateInputObjectSchema: z.ZodType<Prisma.StandardAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardAvgAggregateInputType>;
export const StandardAvgAggregateInputObjectZodSchema = makeSchema();
