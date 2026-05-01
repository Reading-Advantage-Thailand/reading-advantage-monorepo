import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.literal(true).optional(),
  userId: z.literal(true).optional(),
  xp: z.literal(true).optional(),
  level: z.literal(true).optional(),
  streak: z.literal(true).optional(),
  lastActiveAt: z.literal(true).optional(),
  createdAt: z.literal(true).optional(),
  updatedAt: z.literal(true).optional()
}).strict();
export const GamificationProfileMaxAggregateInputObjectSchema: z.ZodType<Prisma.GamificationProfileMaxAggregateInputType> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileMaxAggregateInputType>;
export const GamificationProfileMaxAggregateInputObjectZodSchema = makeSchema();
