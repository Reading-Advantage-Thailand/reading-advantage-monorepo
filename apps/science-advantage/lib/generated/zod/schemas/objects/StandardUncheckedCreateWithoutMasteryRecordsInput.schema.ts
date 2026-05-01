import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateNestedManyWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateNestedManyWithoutStandardsInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  lessons: z.lazy(() => LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema).optional()
}).strict();
export const StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardUncheckedCreateWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedCreateWithoutMasteryRecordsInput>;
export const StandardUncheckedCreateWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
