import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasterySelectObjectSchema as StandardMasterySelectObjectSchema } from './StandardMasterySelect.schema';
import { StandardMasteryIncludeObjectSchema as StandardMasteryIncludeObjectSchema } from './StandardMasteryInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => StandardMasterySelectObjectSchema).optional(),
  include: z.lazy(() => StandardMasteryIncludeObjectSchema).optional()
}).strict();
export const StandardMasteryArgsObjectSchema = makeSchema();
export const StandardMasteryArgsObjectZodSchema = makeSchema();
