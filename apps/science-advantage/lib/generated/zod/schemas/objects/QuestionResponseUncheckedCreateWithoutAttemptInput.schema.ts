import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  questionId: z.string(),
  studentAnswer: z.union([JsonNullValueInputSchema, jsonSchema]),
  isCorrect: z.boolean(),
  timeSpentSeconds: z.number().int().optional(),
  answeredAt: z.coerce.date().optional(),
  order: z.number().int().optional().nullable(),
  createdAt: z.coerce.date().optional()
}).strict();
export const QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseUncheckedCreateWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUncheckedCreateWithoutAttemptInput>;
export const QuestionResponseUncheckedCreateWithoutAttemptInputObjectZodSchema = makeSchema();
