import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  xp: z.literal(true).optional(),
  level: z.literal(true).optional(),
  streak: z.literal(true).optional()
}).strict();
export const GamificationProfileAvgAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileAvgAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileAvgAggregateInputType>;
export const GamificationProfileAvgAggregateInputObjectZodSchema = makeSchema();
