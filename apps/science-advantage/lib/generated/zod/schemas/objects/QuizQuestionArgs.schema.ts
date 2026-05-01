import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionSelectObjectSchema as QuizQuestionSelectObjectSchema } from './QuizQuestionSelect.schema';
import { QuizQuestionIncludeObjectSchema as QuizQuestionIncludeObjectSchema } from './QuizQuestionInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => QuizQuestionSelectObjectSchema).optional(),
  include: z.lazy(() => QuizQuestionIncludeObjectSchema).optional()
}).strict();
export const QuizQuestionArgsObjectSchema = makeSchema();
export const QuizQuestionArgsObjectZodSchema = makeSchema();
