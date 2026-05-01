import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { FloatFilterObjectSchema as FloatFilterObjectSchema } from './FloatFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { LessonScalarRelationFilterObjectSchema as LessonScalarRelationFilterObjectSchema } from './LessonScalarRelationFilter.schema';
import { LessonWhereInputObjectSchema as LessonWhereInputObjectSchema } from './LessonWhereInput.schema';
import { QuestionResponseListRelationFilterObjectSchema as QuestionResponseListRelationFilterObjectSchema } from './QuestionResponseListRelationFilter.schema';
import { MasteryRunNullableScalarRelationFilterObjectSchema as MasteryRunNullableScalarRelationFilterObjectSchema } from './MasteryRunNullableScalarRelationFilter.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema'

const attemptwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AttemptWhereInputObjectSchema), z.lazy(() => AttemptWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AttemptWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AttemptWhereInputObjectSchema), z.lazy(() => AttemptWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  score: z.union([z.lazy(() => FloatFilterObjectSchema), z.number()]).optional(),
  maxScore: z.union([z.lazy(() => FloatFilterObjectSchema), z.number()]).optional(),
  attemptNumber: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  startedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  completedAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  student: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional(),
  lesson: z.union([z.lazy(() => LessonScalarRelationFilterObjectSchema), z.lazy(() => LessonWhereInputObjectSchema)]).optional(),
  questionResponses: z.lazy(() => QuestionResponseListRelationFilterObjectSchema).optional(),
  masteryRun: z.union([z.lazy(() => MasteryRunNullableScalarRelationFilterObjectSchema), z.lazy(() => MasteryRunWhereInputObjectSchema)]).optional()
}).strict();
export const AttemptWhereInputObjectSchema: z.ZodType<Prisma.AttemptWhereInput> = attemptwhereinputSchema as unknown as z.ZodType<Prisma.AttemptWhereInput>;
export const AttemptWhereInputObjectZodSchema = attemptwhereinputSchema;
