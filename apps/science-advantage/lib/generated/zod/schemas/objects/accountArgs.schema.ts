import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountSelectObjectSchema as accountSelectObjectSchema } from './accountSelect.schema';
import { accountIncludeObjectSchema as accountIncludeObjectSchema } from './accountInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => accountSelectObjectSchema).optional(),
  include: z.lazy(() => accountIncludeObjectSchema).optional()
}).strict();
export const accountArgsObjectSchema = makeSchema();
export const accountArgsObjectZodSchema = makeSchema();
