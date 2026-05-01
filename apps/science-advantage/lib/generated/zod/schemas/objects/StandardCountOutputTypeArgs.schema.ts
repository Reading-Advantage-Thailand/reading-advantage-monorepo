import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCountOutputTypeSelectObjectSchema as StandardCountOutputTypeSelectObjectSchema } from './StandardCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => StandardCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const StandardCountOutputTypeArgsObjectSchema = makeSchema();
export const StandardCountOutputTypeArgsObjectZodSchema = makeSchema();
