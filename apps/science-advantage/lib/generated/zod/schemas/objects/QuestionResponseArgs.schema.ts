import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseSelectObjectSchema as QuestionResponseSelectObjectSchema } from './QuestionResponseSelect.schema';
import { QuestionResponseIncludeObjectSchema as QuestionResponseIncludeObjectSchema } from './QuestionResponseInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => QuestionResponseSelectObjectSchema).optional(),
  include: z.lazy(() => QuestionResponseIncludeObjectSchema).optional()
}).strict();
export const QuestionResponseArgsObjectSchema = makeSchema();
export const QuestionResponseArgsObjectZodSchema = makeSchema();
