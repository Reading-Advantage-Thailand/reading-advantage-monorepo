import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  userId: z.string(),
  xp: z.number().int().optional(),
  level: z.number().int().optional(),
  streak: z.number().int().optional(),
  lastActiveAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();
export const GamificationProfileUncheckedCreateInputObjectSchema: z.ZodType<Prisma.GamificationProfileUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileUncheckedCreateInput>;
export const GamificationProfileUncheckedCreateInputObjectZodSchema = makeSchema();
