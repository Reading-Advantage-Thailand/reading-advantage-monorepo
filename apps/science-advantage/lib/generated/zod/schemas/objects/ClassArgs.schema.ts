import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './ClassInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => ClassSelectObjectSchema).optional(),
  include: z.lazy(() => ClassIncludeObjectSchema).optional()
}).strict();
export const ClassArgsObjectSchema = makeSchema();
export const ClassArgsObjectZodSchema = makeSchema();
