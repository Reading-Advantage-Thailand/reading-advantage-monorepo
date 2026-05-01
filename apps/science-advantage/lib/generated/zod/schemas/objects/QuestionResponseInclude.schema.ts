import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptArgsObjectSchema as AttemptArgsObjectSchema } from './AttemptArgs.schema';
import { QuizQuestionArgsObjectSchema as QuizQuestionArgsObjectSchema } from './QuizQuestionArgs.schema'

const makeSchema = () => z.object({
  attempt: z.union([z.boolean(), z.lazy(() => AttemptArgsObjectSchema)]).optional(),
  question: z.union([z.boolean(), z.lazy(() => QuizQuestionArgsObjectSchema)]).optional()
}).strict();
export const QuestionResponseIncludeObjectSchema: z.ZodType<Prisma.QuestionResponseInclude> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseInclude>;
export const QuestionResponseIncludeObjectZodSchema = makeSchema();
