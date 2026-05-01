import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { JsonWithAggregatesFilterObjectSchema as JsonWithAggregatesFilterObjectSchema } from './JsonWithAggregatesFilter.schema';
import { BoolWithAggregatesFilterObjectSchema as BoolWithAggregatesFilterObjectSchema } from './BoolWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema';
import { IntNullableWithAggregatesFilterObjectSchema as IntNullableWithAggregatesFilterObjectSchema } from './IntNullableWithAggregatesFilter.schema'

const questionresponsescalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => QuestionResponseScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => QuestionResponseScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => QuestionResponseScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  attemptId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  questionId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  studentAnswer: z.lazy(() => JsonWithAggregatesFilterObjectSchema).optional(),
  isCorrect: z.union([z.lazy(() => BoolWithAggregatesFilterObjectSchema), z.boolean()]).optional(),
  timeSpentSeconds: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  answeredAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  order: z.union([z.lazy(() => IntNullableWithAggregatesFilterObjectSchema), z.number().int()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const QuestionResponseScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.QuestionResponseScalarWhereWithAggregatesInput> = questionresponsescalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.QuestionResponseScalarWhereWithAggregatesInput>;
export const QuestionResponseScalarWhereWithAggregatesInputObjectZodSchema = questionresponsescalarwherewithaggregatesinputSchema;
