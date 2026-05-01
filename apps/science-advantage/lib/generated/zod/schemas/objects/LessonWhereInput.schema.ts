import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { JsonNullableFilterObjectSchema as JsonNullableFilterObjectSchema } from './JsonNullableFilter.schema';
import { EnumLessonTypeFilterObjectSchema as EnumLessonTypeFilterObjectSchema } from './EnumLessonTypeFilter.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { StandardListRelationFilterObjectSchema as StandardListRelationFilterObjectSchema } from './StandardListRelationFilter.schema';
import { CurriculumUnitListRelationFilterObjectSchema as CurriculumUnitListRelationFilterObjectSchema } from './CurriculumUnitListRelationFilter.schema';
import { QuizQuestionListRelationFilterObjectSchema as QuizQuestionListRelationFilterObjectSchema } from './QuizQuestionListRelationFilter.schema';
import { AttemptListRelationFilterObjectSchema as AttemptListRelationFilterObjectSchema } from './AttemptListRelationFilter.schema';
import { LessonCompletionListRelationFilterObjectSchema as LessonCompletionListRelationFilterObjectSchema } from './LessonCompletionListRelationFilter.schema';
import { AssignmentListRelationFilterObjectSchema as AssignmentListRelationFilterObjectSchema } from './AssignmentListRelationFilter.schema'

const lessonwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => LessonWhereInputObjectSchema), z.lazy(() => LessonWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => LessonWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => LessonWhereInputObjectSchema), z.lazy(() => LessonWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  slug: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  title: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  titleThai: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  description: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  descriptionThai: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  content: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  structuredContent: z.lazy(() => JsonNullableFilterObjectSchema).optional(),
  lessonType: z.union([z.lazy(() => EnumLessonTypeFilterObjectSchema), LessonTypeSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  order: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  standards: z.lazy(() => StandardListRelationFilterObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitListRelationFilterObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionListRelationFilterObjectSchema).optional(),
  attempts: z.lazy(() => AttemptListRelationFilterObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionListRelationFilterObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentListRelationFilterObjectSchema).optional()
}).strict();
export const LessonWhereInputObjectSchema: z.ZodType<Prisma.LessonWhereInput> = lessonwhereinputSchema as unknown as z.ZodType<Prisma.LessonWhereInput>;
export const LessonWhereInputObjectZodSchema = lessonwhereinputSchema;
