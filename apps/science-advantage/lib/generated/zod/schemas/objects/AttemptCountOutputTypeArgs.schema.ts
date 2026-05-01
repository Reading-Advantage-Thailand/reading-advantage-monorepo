import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCountOutputTypeSelectObjectSchema as AttemptCountOutputTypeSelectObjectSchema } from './AttemptCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => AttemptCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const AttemptCountOutputTypeArgsObjectSchema = makeSchema();
export const AttemptCountOutputTypeArgsObjectZodSchema = makeSchema();
