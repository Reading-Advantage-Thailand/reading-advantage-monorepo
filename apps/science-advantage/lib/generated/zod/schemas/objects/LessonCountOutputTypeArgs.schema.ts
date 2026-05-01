import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCountOutputTypeSelectObjectSchema as LessonCountOutputTypeSelectObjectSchema } from './LessonCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => LessonCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const LessonCountOutputTypeArgsObjectSchema = makeSchema();
export const LessonCountOutputTypeArgsObjectZodSchema = makeSchema();
