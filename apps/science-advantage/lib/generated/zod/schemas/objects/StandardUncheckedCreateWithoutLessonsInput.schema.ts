import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateNestedManyWithoutStandardsInput.schema';
import { StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateNestedManyWithoutStandardInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema).optional()
}).strict();
export const StandardUncheckedCreateWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUncheckedCreateWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedCreateWithoutLessonsInput>;
export const StandardUncheckedCreateWithoutLessonsInputObjectZodSchema = makeSchema();
