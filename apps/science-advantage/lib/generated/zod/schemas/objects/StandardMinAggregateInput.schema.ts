import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  framework: z.literal(true).optional(),
  code: z.literal(true).optional(),
  description: z.literal(true).optional(),
  gradeLevel: z.literal(true).optional()
}).strict();
export const StandardMinAggregateInputObjectSchema: z.ZodType<Prisma.StandardMinAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardMinAggregateInputType>;
export const StandardMinAggregateInputObjectZodSchema = makeSchema();
