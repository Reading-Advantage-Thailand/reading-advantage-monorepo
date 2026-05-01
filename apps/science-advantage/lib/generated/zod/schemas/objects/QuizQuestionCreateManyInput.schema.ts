import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  lessonId: z.string(),
  type: QuestionTypeSchema,
  text: z.string(),
  options: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  correctAnswer: z.union([JsonNullValueInputSchema, jsonSchema]),
  points: z.number().int().optional(),
  order: z.number().int(),
  version: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const QuizQuestionCreateManyInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateManyInput>;
export const QuizQuestionCreateManyInputObjectZodSchema = makeSchema();
