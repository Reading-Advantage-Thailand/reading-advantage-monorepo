import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { JsonNullValueInputSchema } from '../enums/JsonNullValueInput.schema';
import { LessonCreateNestedOneWithoutQuizQuestionsInputObjectSchema as LessonCreateNestedOneWithoutQuizQuestionsInputObjectSchema } from './LessonCreateNestedOneWithoutQuizQuestionsInput.schema';
import { StandardCreateNestedManyWithoutQuizQuestionsInputObjectSchema as StandardCreateNestedManyWithoutQuizQuestionsInputObjectSchema } from './StandardCreateNestedManyWithoutQuizQuestionsInput.schema';
import { QuestionResponseCreateNestedManyWithoutQuestionInputObjectSchema as QuestionResponseCreateNestedManyWithoutQuestionInputObjectSchema } from './QuestionResponseCreateNestedManyWithoutQuestionInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  type: QuestionTypeSchema,
  text: z.string(),
  options: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  correctAnswer: z.union([JsonNullValueInputSchema, jsonSchema]),
  points: z.number().int().optional(),
  order: z.number().int(),
  version: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
  lesson: z.lazy(() => LessonCreateNestedOneWithoutQuizQuestionsInputObjectSchema),
  standards: z.lazy(() => StandardCreateNestedManyWithoutQuizQuestionsInputObjectSchema),
  responses: z.lazy(() => QuestionResponseCreateNestedManyWithoutQuestionInputObjectSchema)
}).strict();
export const QuizQuestionCreateInputObjectSchema: z.ZodType<Prisma.QuizQuestionCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCreateInput>;
export const QuizQuestionCreateInputObjectZodSchema = makeSchema();
