import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumStandardsAlignmentFilterObjectSchema as EnumStandardsAlignmentFilterObjectSchema } from './EnumStandardsAlignmentFilter.schema';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { IntNullableFilterObjectSchema as IntNullableFilterObjectSchema } from './IntNullableFilter.schema';
import { LessonListRelationFilterObjectSchema as LessonListRelationFilterObjectSchema } from './LessonListRelationFilter.schema';
import { QuizQuestionListRelationFilterObjectSchema as QuizQuestionListRelationFilterObjectSchema } from './QuizQuestionListRelationFilter.schema';
import { StandardMasteryListRelationFilterObjectSchema as StandardMasteryListRelationFilterObjectSchema } from './StandardMasteryListRelationFilter.schema'

const standardwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardWhereInputObjectSchema), z.lazy(() => StandardWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardWhereInputObjectSchema), z.lazy(() => StandardWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  framework: z.union([z.lazy(() => EnumStandardsAlignmentFilterObjectSchema), StandardsAlignmentSchema]).optional(),
  code: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  description: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  gradeLevel: z.union([z.lazy(() => IntNullableFilterObjectSchema), z.number().int()]).optional().nullable(),
  lessons: z.lazy(() => LessonListRelationFilterObjectSchema).optional(),
  quizQuestions: z.lazy(() => QuizQuestionListRelationFilterObjectSchema).optional(),
  masteryRecords: z.lazy(() => StandardMasteryListRelationFilterObjectSchema).optional()
}).strict();
export const StandardWhereInputObjectSchema: z.ZodType<Prisma.StandardWhereInput> = standardwhereinputSchema as unknown as z.ZodType<Prisma.StandardWhereInput>;
export const StandardWhereInputObjectZodSchema = standardwhereinputSchema;
