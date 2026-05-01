import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { QuizQuestionCreateNestedOneWithoutResponsesInputObjectSchema as QuizQuestionCreateNestedOneWithoutResponsesInputObjectSchema } from './QuizQuestionCreateNestedOneWithoutResponsesInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentAnswer: z.union([JsonNullValueInputSchema, jsonSchema]),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().optional(),
  answeredAt: z.coerce.date().optional(),
  order: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  question: z.lazy(() => QuizQuestionCreateNestedOneWithoutResponsesInputObjectSchema)
}).strict();
export const QuestionResponseCreateWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseCreateWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateWithoutAttemptInput>;
export const QuestionResponseCreateWithoutAttemptInputObjectZodSchema = makeSchema();
