import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  framework: z.literal(true).optional(),
  code: z.literal(true).optional(),
  description: z.literal(true).optional(),
  gradeLevel: z.literal(true).optional(),
  _all: z.literal(true).optional()
}).strict();
export const StandardCountAggregateInputObjectSchema: z.ZodType<Prisma.StandardCountAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardCountAggregateInputType>;
export const StandardCountAggregateInputObjectZodSchema = makeSchema();
