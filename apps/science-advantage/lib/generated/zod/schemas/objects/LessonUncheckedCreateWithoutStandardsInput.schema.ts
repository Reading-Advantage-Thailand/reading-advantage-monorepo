import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { CurriculumUnitUncheckedCreateNestedManyWithoutLessonsInputObjectSchema as CurriculumUnitUncheckedCreateNestedManyWithoutLessonsInputObjectSchema } from './CurriculumUnitUncheckedCreateNestedManyWithoutLessonsInput.schema';
import { QuizQuestionUncheckedCreateNestedManyWithoutLessonInputObjectSchema as QuizQuestionUncheckedCreateNestedManyWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedCreateNestedManyWithoutLessonInput.schema';
import { AttemptUncheckedCreateNestedManyWithoutLessonInputObjectSchema as AttemptUncheckedCreateNestedManyWithoutLessonInputObjectSchema } from './AttemptUncheckedCreateNestedManyWithoutLessonInput.schema';
import { LessonCompletionUncheckedCreateNestedManyWithoutLessonInputObjectSchema as LessonCompletionUncheckedCreateNestedManyWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedCreateNestedManyWithoutLessonInput.schema';
import { AssignmentUncheckedCreateNestedManyWithoutLessonInputObjectSchema as AssignmentUncheckedCreateNestedManyWithoutLessonInputObjectSchema } from './AssignmentUncheckedCreateNestedManyWithoutLessonInput.schema'

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
  curriculumUnits: z.lazy(() => CurriculumUnitUncheckedCreateNestedManyWithoutLessonsInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedCreateNestedManyWithoutLessonInputObjectSchema).optional(),
  attempts: z.lazy(() => AttemptUncheckedCreateNestedManyWithoutLessonInputObjectSchema).optional(),
  lessonCompletions: z.lazy(() => LessonCompletionUncheckedCreateNestedManyWithoutLessonInputObjectSchema).optional(),
  assignments: z.lazy(() => AssignmentUncheckedCreateNestedManyWithoutLessonInputObjectSchema).optional()
}).strict();
export const LessonUncheckedCreateWithoutStandardsInputObjectSchema: z.ZodType<Prisma.LessonUncheckedCreateWithoutStandardsInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonUncheckedCreateWithoutStandardsInput>;
export const LessonUncheckedCreateWithoutStandardsInputObjectZodSchema = makeSchema();
