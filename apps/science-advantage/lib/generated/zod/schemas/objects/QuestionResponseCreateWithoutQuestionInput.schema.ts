import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema as AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema } from './AttemptCreateNestedOneWithoutQuestionResponsesInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentAnswer: z.union([JsonNullValueInputSchema, jsonSchema]),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().optional(),
  answeredAt: z.coerce.date().optional(),
  order: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  attempt: z.lazy(() => AttemptCreateNestedOneWithoutQuestionResponsesInputObjectSchema)
}).strict();
export const QuestionResponseCreateWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseCreateWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateWithoutQuestionInput>;
export const QuestionResponseCreateWithoutQuestionInputObjectZodSchema = makeSchema();
