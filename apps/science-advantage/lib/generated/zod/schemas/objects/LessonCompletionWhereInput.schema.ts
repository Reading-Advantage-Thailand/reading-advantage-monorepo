import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumLessonCompletionStatusFilterObjectSchema as EnumLessonCompletionStatusFilterObjectSchema } from './EnumLessonCompletionStatusFilter.schema';
import { LessonCompletionStatusSchema } from '../enums/LessonCompletionStatus.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { FloatNullableFilterObjectSchema as FloatNullableFilterObjectSchema } from './FloatNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { LessonScalarRelationFilterObjectSchema as LessonScalarRelationFilterObjectSchema } from './LessonScalarRelationFilter.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema'

const lessoncompletionwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => LessonCompletionWhereInputObjectSchema), z.lazy(() => LessonCompletionWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => LessonCompletionWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => LessonCompletionWhereInputObjectSchema), z.lazy(() => LessonCompletionWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  status: z.union([z.lazy(() => EnumLessonCompletionStatusFilterObjectSchema), LessonCompletionStatusSchema]).optional(),
  completedAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  attemptsCount: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  bestScore: z.union([z.lazy(() => FloatNullableFilterObjectSchema), z.number()]).optional().nullable(),
  bestScorePercentage: z.union([z.lazy(() => FloatNullableFilterObjectSchema), z.number()]).optional().nullable(),
  mostRecentScore: z.union([z.lazy(() => FloatNullableFilterObjectSchema), z.number()]).optional().nullable(),
  mostRecentScorePercentage: z.union([z.lazy(() => FloatNullableFilterObjectSchema), z.number()]).optional().nullable(),
  totalTimeSpentSeconds: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastAttemptAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  student: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional(),
  lesson: z.union([z.lazy(() => LessonScalarRelationFilterObjectSchema), z.lazy(() => LessonWhereInputObjectSchema)]).optional()
}).strict();
export const LessonCompletionWhereInputObjectSchema: z.ZodType<Prisma.LessonCompletionWhereInput> = lessoncompletionwhereinputSchema as unknown as z.ZodType<Prisma.LessonCompletionWhereInput>;
export const LessonCompletionWhereInputObjectZodSchema = lessoncompletionwhereinputSchema;
