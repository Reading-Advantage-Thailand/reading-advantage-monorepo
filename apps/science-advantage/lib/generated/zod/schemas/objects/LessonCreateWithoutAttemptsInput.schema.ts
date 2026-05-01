import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { StandardCreateNestedManyWithoutLessonsInputObjectSchema as StandardCreateNestedManyWithoutLessonsInputObjectSchema } from './StandardCreateNestedManyWithoutLessonsInput.schema';
import { CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema as CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateNestedManyWithoutLessonsInput.schema';
import { QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema as QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema } from './QuizQuestionCreateNestedManyWithoutLessonInput.schema';
import { LessonCompletionCreateNestedManyWithoutLessonInputObjectSchema as LessonCompletionCreateNestedManyWithoutLessonInputObjectSchema } from './LessonCompletionCreateNestedManyWithoutLessonInput.schema';
import { AssignmentCreateNestedManyWithoutLessonInputObjectSchema as AssignmentCreateNestedManyWithoutLessonInputObjectSchema } from './AssignmentCreateNestedManyWithoutLessonInput.schema'

import { JsonValueSchema as jsonSchema } from '../../helpers/json-helpers';

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  titleThai: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionThai: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  structuredContent: z.union([NullableJsonNullValueInputSchema, jsonSchema]).optional(),
  lessonType: LessonTypeSchema.optional(),
  gradeLevel: z.number().int(),
  order: z.number().int(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  standards: z.lazy(() => StandardCreateNestedManyWithoutLessonsInputObjectSchema).optional(),
  curriculumUnits: z.lazy(() => CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionCreateNestedManyWithoutLessonInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentCreateNestedManyWithoutLessonInputObjectSchema).optional()
}).strict();
export const LessonCreateWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.LessonCreateWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateWithoutAttemptsInput>;
export const LessonCreateWithoutAttemptsInputObjectZodSchema = makeSchema();
