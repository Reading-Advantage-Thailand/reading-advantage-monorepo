import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  xp: z.number().int().optional(),
  level: z.number().int().optional(),
  streak: z.number().int().optional(),
  lastActiveAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const GamificationProfileCreateWithoutUserInputObjectSchema: z.ZodType<Prisma.GamificationProfileCreateWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileCreateWithoutUserInput>;
export const GamificationProfileCreateWithoutUserInputObjectZodSchema = makeSchema();
