import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptArgsObjectSchema as AttemptArgsObjectSchema } from './AttemptArgs.schema';
import { QuizQuestionArgsObjectSchema as QuizQuestionArgsObjectSchema } from './QuizQuestionArgs.schema'

const makeSchema = () => z.object({
  id: z.boolean().optional(),
  attemptId: z.boolean().optional(),
  questionId: z.boolean().optional(),
  studentAnswer: z.boolean().optional(),
  isCorrect: z.boolean().optional(),
  timeSpentSeconds: z.boolean().optional(),
  answeredAt: z.boolean().optional(),
  order: z.boolean().optional(),
  attempt: z.union([z.boolean(), z.lazy(() => AttemptArgsObjectSchema)]).optional(),
  question: z.union([z.boolean(), z.lazy(() => QuizQuestionArgsObjectSchema)]).optional(),
  createdAt: z.boolean().optional()
}).strict();
export const QuestionResponseSelectObjectSchema: z.ZodType<Prisma.QuestionResponseSelect> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseSelect>;
export const QuestionResponseSelectObjectZodSchema = makeSchema();
