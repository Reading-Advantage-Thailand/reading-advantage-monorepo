import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonSelectObjectSchema as LessonSelectObjectSchema } from './LessonSelect.schema';
import { LessonIncludeObjectSchema as LessonIncludeObjectSchema } from './LessonInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => LessonSelectObjectSchema).optional(),
  include: z.lazy(() => LessonIncludeObjectSchema).optional()
}).strict();
export const LessonArgsObjectSchema = makeSchema();
export const LessonArgsObjectZodSchema = makeSchema();
