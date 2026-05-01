import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './MasteryRunInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => MasteryRunSelectObjectSchema).optional(),
  include: z.lazy(() => MasteryRunIncludeObjectSchema).optional()
}).strict();
export const MasteryRunArgsObjectSchema = makeSchema();
export const MasteryRunArgsObjectZodSchema = makeSchema();
