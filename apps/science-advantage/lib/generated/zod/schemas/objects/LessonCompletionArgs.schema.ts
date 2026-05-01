import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionSelectObjectSchema as LessonCompletionSelectObjectSchema } from './LessonCompletionSelect.schema';
import { LessonCompletionIncludeObjectSchema as LessonCompletionIncludeObjectSchema } from './LessonCompletionInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => LessonCompletionSelectObjectSchema).optional(),
  include: z.lazy(() => LessonCompletionIncludeObjectSchema).optional()
}).strict();
export const LessonCompletionArgsObjectSchema = makeSchema();
export const LessonCompletionArgsObjectZodSchema = makeSchema();
