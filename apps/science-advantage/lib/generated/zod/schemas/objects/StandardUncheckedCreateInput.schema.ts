import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateNestedManyWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateNestedManyWithoutStandardsInput.schema';
import { StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateNestedManyWithoutStandardInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  lessons: z.lazy(() => LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema),
  quizQuestions: z.lazy(() => QuizQuestionUncheckedCreateNestedManyWithoutStandardsInputObjectSchema),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema)
}).strict();
export const StandardUncheckedCreateInputObjectSchema: z.ZodType<Prisma.StandardUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedCreateInput>;
export const StandardUncheckedCreateInputObjectZodSchema = makeSchema();
