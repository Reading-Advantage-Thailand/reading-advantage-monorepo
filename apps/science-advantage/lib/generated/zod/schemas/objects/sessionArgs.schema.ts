import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './sessionInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => sessionSelectObjectSchema).optional(),
  include: z.lazy(() => sessionIncludeObjectSchema).optional()
}).strict();
export const sessionArgsObjectSchema = makeSchema();
export const sessionArgsObjectZodSchema = makeSchema();
