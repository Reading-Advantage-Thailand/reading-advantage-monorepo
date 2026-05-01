import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumQuestionTypeFilterObjectSchema as EnumQuestionTypeFilterObjectSchema } from './EnumQuestionTypeFilter.schema';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { JsonNullableFilterObjectSchema as JsonNullableFilterObjectSchema } from './JsonNullableFilter.schema';
import { JsonFilterObjectSchema as JsonFilterObjectSchema } from './JsonFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { LessonScalarRelationFilterObjectSchema as LessonScalarRelationFilterObjectSchema } from './LessonScalarRelationFilter.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { StandardListRelationFilterObjectSchema as StandardListRelationFilterObjectSchema } from './StandardListRelationFilter.schema';
import { QuestionResponseListRelationFilterObjectSchema as QuestionResponseListRelationFilterObjectSchema } from './QuestionResponseListRelationFilter.schema'

const quizquestionwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => QuizQuestionWhereInputObjectSchema), z.lazy(() => QuizQuestionWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => QuizQuestionWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => QuizQuestionWhereInputObjectSchema), z.lazy(() => QuizQuestionWhereInputObjectSchema).array()]).optional(),
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
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  lesson: z.union([z.lazy(() => LessonScalarRelationFilterObjectSchema), z.lazy(() => LessonWhereInputObjectSchema)]).optional(),
  standards: z.lazy(() => StandardListRelationFilterObjectSchema).optional(),
  responses: z.lazy(() => QuestionResponseListRelationFilterObjectSchema).optional()
}).strict();
export const QuizQuestionWhereInputObjectSchema: z.ZodType<Prisma.QuizQuestionWhereInput> = quizquestionwhereinputSchema as unknown as z.ZodType<Prisma.QuizQuestionWhereInput>;
export const QuizQuestionWhereInputObjectZodSchema = quizquestionwhereinputSchema;
