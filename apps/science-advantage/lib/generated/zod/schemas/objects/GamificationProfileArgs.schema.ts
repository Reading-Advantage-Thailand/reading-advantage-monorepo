import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './GamificationProfileSelect.schema';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './GamificationProfileInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => GamificationProfileSelectObjectSchema).optional(),
  include: z.lazy(() => GamificationProfileIncludeObjectSchema).optional()
}).strict();
export const GamificationProfileArgsObjectSchema = makeSchema();
export const GamificationProfileArgsObjectZodSchema = makeSchema();
