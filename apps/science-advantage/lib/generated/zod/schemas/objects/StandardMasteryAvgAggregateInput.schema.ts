import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  masteryLevel: z.literal(true).optional(),
  evidenceCount: z.literal(true).optional()
}).strict();
export const StandardMasteryAvgAggregateInputObjectSchema: z.ZodType<Prisma.StandardMasteryAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryAvgAggregateInputType>;
export const StandardMasteryAvgAggregateInputObjectZodSchema = makeSchema();
