import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  userId: z.boolean().optional(),
  xp: z.boolean().optional(),
  level: z.boolean().optional(),
  streak: z.boolean().optional(),
  lastActiveAt: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  user: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional()
}).strict();
export const GamificationProfileSelectObjectSchema: z.ZodType<Prisma.GamificationProfileSelect> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileSelect>;
export const GamificationProfileSelectObjectZodSchema = makeSchema();
