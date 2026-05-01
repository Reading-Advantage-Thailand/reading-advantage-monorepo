import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema as AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateNestedOneWithoutQuestionResponsesInput.schema';
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
  attempt: z.lazy(() => AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema),
  question: z.lazy(() => QuizQuestionCreateNestedOneWithoutResponsesInputObjectSchema)
}).strict();
export const QuestionResponseCreateInputObjectSchema: z.ZodType<Prisma.QuestionResponseCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateInput>;
export const QuestionResponseCreateInputObjectZodSchema = makeSchema();
