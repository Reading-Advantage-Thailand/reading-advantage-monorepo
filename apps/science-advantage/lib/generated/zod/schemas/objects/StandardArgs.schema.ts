import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardSelectObjectSchema as StandardSelectObjectSchema } from './StandardSelect.schema';
import { StandardIncludeObjectSchema as StandardIncludeObjectSchema } from './StandardInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => StandardSelectObjectSchema).optional(),
  include: z.lazy(() => StandardIncludeObjectSchema).optional()
}).strict();
export const StandardArgsObjectSchema = makeSchema();
export const StandardArgsObjectZodSchema = makeSchema();
