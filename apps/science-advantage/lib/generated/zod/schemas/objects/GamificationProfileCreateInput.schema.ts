import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutGamificationProfileInputObjectSchema as userCreateNestedOneWithoutGamificationProfileInputObjectSchema } from './userCreateNestedOneWithoutGamificationProfileInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  xp: z.number().int().optional(),
  level: z.number().int().optional(),
  streak: z.number().int().optional(),
  lastActiveAt: z.coerce.date().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  user: z.lazy(() => userCreateNestedOneWithoutGamificationProfileInputObjectSchema)
}).strict();
export const GamificationProfileCreateInputObjectSchema: z.ZodType<Prisma.GamificationProfileCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileCreateInput>;
export const GamificationProfileCreateInputObjectZodSchema = makeSchema();
