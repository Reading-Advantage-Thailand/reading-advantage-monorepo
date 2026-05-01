import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionTypeSchema } from '../enums/QuestionType.schema';
import { NestedEnumQuestionTypeFilterObjectSchema as NestedEnumQuestionTypeFilterObjectSchema } from './NestedEnumQuestionTypeFilter.schema'

const makeSchema = () => z.object({
  equals: QuestionTypeSchema.optional(),
  in: QuestionTypeSchema.array().optional(),
  notIn: QuestionTypeSchema.array().optional(),
  not: z.union([QuestionTypeSchema, z.lazy(() => NestedEnumQuestionTypeFilterObjectSchema)]).optional()
}).strict();
export const EnumQuestionTypeFilterObjectSchema: z.ZodType<Prisma.EnumQuestionTypeFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumQuestionTypeFilter>;
export const EnumQuestionTypeFilterObjectZodSchema = makeSchema();
