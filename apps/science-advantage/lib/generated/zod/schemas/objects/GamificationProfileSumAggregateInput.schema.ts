import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  xp: z.literal(true).optional(),
  level: z.literal(true).optional(),
  streak: z.literal(true).optional()
}).strict();
export const GamificationProfileSumAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileSumAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileSumAggregateInputType>;
export const GamificationProfileSumAggregateInputObjectZodSchema = makeSchema();
