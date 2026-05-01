import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumQuestionTypeFilterObjectSchema as EnumQuestionTypeFilterObjectSchema } from './EnumQuestionTypeFilter.schema';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { JsonNullableFilterObjectSchema as JsonNullableFilterObjectSchema } from './JsonNullableFilter.schema';
import { JsonFilterObjectSchema as JsonFilterObjectSchema } from './JsonFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const quizquestionscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => QuizQuestionScalarWhereInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => QuizQuestionScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => QuizQuestionScalarWhereInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  type: z.union([z.lazy(() => EnumQuestionTypeFilterObjectSchema), QuestionTypeSchema]).optional(),
  text: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  options: z.lazy(() => JsonNullableFilterObjectSchema).optional(),
  correctAnswer: z.lazy(() => JsonFilterObjectSchema).optional(),
  points: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  version: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const QuizQuestionScalarWhereInputObjectSchema: z.ZodType<Prisma.QuizQuestionScalarWhereInput> = quizquestionscalarwhereinputSchema as unknown as z.ZodType<Prisma.QuizQuestionScalarWhereInput>;
export const QuizQuestionScalarWhereInputObjectZodSchema = quizquestionscalarwhereinputSchema;
