import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userSelectObjectSchema as userSelectObjectSchema } from './userSelect.schema';
import { userIncludeObjectSchema as userIncludeObjectSchema } from './userInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => userSelectObjectSchema).optional(),
  include: z.lazy(() => userIncludeObjectSchema).optional()
}).strict();
export const userArgsObjectSchema = makeSchema();
export const userArgsObjectZodSchema = makeSchema();
