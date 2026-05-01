import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCountOutputTypeSelectObjectSchema as ClassCountOutputTypeSelectObjectSchema } from './ClassCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => ClassCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const ClassCountOutputTypeArgsObjectSchema = makeSchema();
export const ClassCountOutputTypeArgsObjectZodSchema = makeSchema();
