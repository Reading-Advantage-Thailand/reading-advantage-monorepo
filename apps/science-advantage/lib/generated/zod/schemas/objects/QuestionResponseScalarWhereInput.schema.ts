import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { JsonFilterObjectSchema as JsonFilterObjectSchema } from './JsonFilter.schema';
import { BoolFilterObjectSchema as BoolFilterObjectSchema } from './BoolFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { IntNullableFilterObjectSchema as IntNullableFilterObjectSchema } from './IntNullableFilter.schema'

const questionresponsescalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => QuestionResponseScalarWhereInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => QuestionResponseScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => QuestionResponseScalarWhereInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  attemptId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  questionId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentAnswer: z.lazy(() => JsonFilterObjectSchema).optional(),
  isCorrect: z.union([z.lazy(() => BoolFilterObjectSchema), z.boolean()]).optional(),
  timeSpentSeconds: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  answeredAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  order: z.union([z.lazy(() => IntNullableFilterObjectSchema), z.number().int()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const QuestionResponseScalarWhereInputObjectSchema: z.ZodType<Prisma.QuestionResponseScalarWhereInput> = questionresponsescalarwhereinputSchema as unknown as z.ZodType<Prisma.QuestionResponseScalarWhereInput>;
export const QuestionResponseScalarWhereInputObjectZodSchema = questionresponsescalarwhereinputSchema;
