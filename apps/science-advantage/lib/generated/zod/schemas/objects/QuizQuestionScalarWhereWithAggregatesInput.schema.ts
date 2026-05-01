import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { EnumQuestionTypeWithAggregatesFilterObjectSchema as EnumQuestionTypeWithAggregatesFilterObjectSchema } from './EnumQuestionTypeWithAggregatesFilter.schema';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { JsonNullableWithAggregatesFilterObjectSchema as JsonNullableWithAggregatesFilterObjectSchema } from './JsonNullableWithAggregatesFilter.schema';
import { JsonWithAggregatesFilterObjectSchema as JsonWithAggregatesFilterObjectSchema } from './JsonWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const quizquestionscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => QuizQuestionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => QuizQuestionScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => QuizQuestionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  type: z.union([z.lazy(() => EnumQuestionTypeWithAggregatesFilterObjectSchema), QuestionTypeSchema]).optional(),
  text: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  options: z.lazy(() => JsonNullableWithAggregatesFilterObjectSchema).optional(),
  correctAnswer: z.lazy(() => JsonWithAggregatesFilterObjectSchema).optional(),
  points: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  version: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const QuizQuestionScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.QuizQuestionScalarWhereWithAggregatesInput> = quizquestionscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.QuizQuestionScalarWhereWithAggregatesInput>;
export const QuizQuestionScalarWhereWithAggregatesInputObjectZodSchema = quizquestionscalarwherewithaggregatesinputSchema;
