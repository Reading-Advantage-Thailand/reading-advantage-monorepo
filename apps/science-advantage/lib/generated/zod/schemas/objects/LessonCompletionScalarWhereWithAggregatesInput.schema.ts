import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { EnumLessonCompletionStatusWithAggregatesFilterObjectSchema as EnumLessonCompletionStatusWithAggregatesFilterObjectSchema } from './EnumLessonCompletionStatusWithAggregatesFilter.schema';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { DateTimeNullableWithAggregatesFilterObjectSchema as DateTimeNullableWithAggregatesFilterObjectSchema } from './DateTimeNullableWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { FloatNullableWithAggregatesFilterObjectSchema as FloatNullableWithAggregatesFilterObjectSchema } from './FloatNullableWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const lessoncompletionscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => LessonCompletionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => LessonCompletionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => LessonCompletionScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => LessonCompletionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => LessonCompletionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  status: z.union([z.lazy(() => EnumLessonCompletionStatusWithAggregatesFilterObjectSchema), LessonCompletionStatusSchema]).optional(),
  completedAt: z.union([z.lazy(() => DateTimeNullableWithAggregatesFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  attemptsCount: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  bestScore: z.union([z.lazy(() => FloatNullableWithAggregatesFilterObjectSchema), z.number()]).optional().nullable(),
  bestScorePercentage: z.union([z.lazy(() => FloatNullableWithAggregatesFilterObjectSchema), z.number()]).optional().nullable(),
  mostRecentScore: z.union([z.lazy(() => FloatNullableWithAggregatesFilterObjectSchema), z.number()]).optional().nullable(),
  mostRecentScorePercentage: z.union([z.lazy(() => FloatNullableWithAggregatesFilterObjectSchema), z.number()]).optional().nullable(),
  totalTimeSpentSeconds: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  lastAttemptAt: z.union([z.lazy(() => DateTimeNullableWithAggregatesFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const LessonCompletionScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.LessonCompletionScalarWhereWithAggregatesInput> = lessoncompletionscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.LessonCompletionScalarWhereWithAggregatesInput>;
export const LessonCompletionScalarWhereWithAggregatesInputObjectZodSchema = lessoncompletionscalarwherewithaggregatesinputSchema;
