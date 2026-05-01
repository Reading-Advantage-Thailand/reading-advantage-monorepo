import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema as LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema } from './LessonUncheckedCreateNestedManyWithoutStandardsInput.schema';
import { StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema as StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema } from './StandardMasteryUncheckedCreateNestedManyWithoutStandardInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable(),
  lessons: z.lazy(() => LessonUncheckedCreateNestedManyWithoutStandardsInputObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryUncheckedCreateNestedManyWithoutStandardInputObjectSchema).optional()
}).strict();
export const StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardUncheckedCreateWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedCreateWithoutQuizQuestionsInput>;
export const StandardUncheckedCreateWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
