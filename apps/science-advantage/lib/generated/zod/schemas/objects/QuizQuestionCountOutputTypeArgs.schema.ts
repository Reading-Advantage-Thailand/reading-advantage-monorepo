import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCountOutputTypeSelectObjectSchema as QuizQuestionCountOutputTypeSelectObjectSchema } from './QuizQuestionCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => QuizQuestionCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const QuizQuestionCountOutputTypeArgsObjectSchema = makeSchema();
export const QuizQuestionCountOutputTypeArgsObjectZodSchema = makeSchema();
