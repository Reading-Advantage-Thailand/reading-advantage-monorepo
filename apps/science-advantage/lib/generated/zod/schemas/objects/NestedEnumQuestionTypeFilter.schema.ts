import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionTypeSchema } from '../enums/QuestionType.schema'

const nestedenumquestiontypefilterSchema = z.object({
  equals: QuestionTypeSchema.optional(),
  in: QuestionTypeSchema.array().optional(),
  notIn: QuestionTypeSchema.array().optional(),
  not: z.union([QuestionTypeSchema, z.lazy(() => NestedEnumQuestionTypeFilterObjectSchema)]).optional()
}).strict();
export const NestedEnumQuestionTypeFilterObjectSchema: z.ZodType<Prisma.NestedEnumQuestionTypeFilter> = nestedenumquestiontypefilterSchema as unknown as z.ZodType<Prisma.NestedEnumQuestionTypeFilter>;
export const NestedEnumQuestionTypeFilterObjectZodSchema = nestedenumquestiontypefilterSchema;
