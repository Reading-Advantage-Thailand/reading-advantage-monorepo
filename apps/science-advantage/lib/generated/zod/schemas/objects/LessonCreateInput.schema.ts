import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { NullableJsonNullValueInputSchema } from '../enums/NullableJsonNullValueInput.schema';
import { LessonTypeSchema } from '../enums/LessonType.schema';
import { StandardCreateNestedManyWithoutLessonsInputObjectSchema as StandardCreateNestedManyWithoutLessonsInputObjectSchema } from './StandardCreateNestedManyWithoutLessonsInput.schema';
import { CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema as CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema } from './CurriculumUnitCreateNestedManyWithoutLessonsInput.schema';
import { QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema as QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema } from './QuizQuestionCreateNestedManyWithoutLessonInput.schema';
import { AttemptCreateNestedManyWithoutLessonInputObjectSchema as AttemptCreateNestedManyWithoutLessonInputObjectSchema } from './AttemptCreateNestedManyWithoutLessonInput.schema';
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
  standards: z.lazy(() => StandardCreateNestedManyWithoutLessonsInputObjectSchema),
  curriculumUnits: z.lazy(() => CurriculumUnitCreateNestedManyWithoutLessonsInputObjectSchema),
  quizQuestions: z.lazy(() => QuizQuestionCreateNestedManyWithoutLessonInputObjectSchema),
  attempts: z.lazy(() => AttemptCreateNestedManyWithoutLessonInputObjectSchema),
  lessonCompletions: z.lazy(() => LessonCompletionCreateNestedManyWithoutLessonInputObjectSchema),
  assignments: z.lazy(() => AssignmentCreateNestedManyWithoutLessonInputObjectSchema)
}).strict();
export const LessonCreateInputObjectSchema: z.ZodType<Prisma.LessonCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCreateInput>;
export const LessonCreateInputObjectZodSchema = makeSchema();
