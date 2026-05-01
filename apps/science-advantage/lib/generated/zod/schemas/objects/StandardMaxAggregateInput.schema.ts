import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  framework: z.literal(true).optional(),
  code: z.literal(true).optional(),
  description: z.literal(true).optional(),
  gradeLevel: z.literal(true).optional()
}).strict();
export const StandardMaxAggregateInputObjectSchema: z.ZodType<Prisma.StandardMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardMaxAggregateInputType>;
export const StandardMaxAggregateInputObjectZodSchema = makeSchema();
