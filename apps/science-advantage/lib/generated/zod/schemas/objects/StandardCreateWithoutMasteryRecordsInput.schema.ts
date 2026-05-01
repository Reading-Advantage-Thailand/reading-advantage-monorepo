import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonCreateNestedManyWithoutStandardsInputObjectSchema as LessonCreateNestedManyWithoutStandardsInputObjectSchema } from './LessonCreateNestedManyWithoutStandardsInput.schema';
import { QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema as QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema } from './QuizQuestionCreateNestedManyWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  lessons: z.lazy(() => LessonCreateNestedManyWithoutStandardsInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema).optional()
}).strict();
export const StandardCreateWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardCreateWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateWithoutMasteryRecordsInput>;
export const StandardCreateWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
