import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonCreateNestedManyWithoutStandardsInputObjectSchema as LessonCreateNestedManyWithoutStandardsInputObjectSchema } from './LessonCreateNestedManyWithoutStandardsInput.schema';
import { QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema as QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema } from './QuizQuestionCreateNestedManyWithoutStandardsInput.schema';
import { StandardMasteryCreateNestedManyWithoutStandardInputObjectSchema as StandardMasteryCreateNestedManyWithoutStandardInputObjectSchema } from './StandardMasteryCreateNestedManyWithoutStandardInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  lessons: z.lazy(() => LessonCreateNestedManyWithoutStandardsInputObjectSchema),
  quizQuestions: z.lazy(() => QuizQuestionCreateNestedManyWithoutStandardsInputObjectSchema),
  masteryRecords: z.lazy(() => StandardMasteryCreateNestedManyWithoutStandardInputObjectSchema)
}).strict();
export const StandardCreateInputObjectSchema: z.ZodType<Prisma.StandardCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateInput>;
export const StandardCreateInputObjectZodSchema = makeSchema();
