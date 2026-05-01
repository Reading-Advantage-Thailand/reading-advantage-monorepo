import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { FloatFilterObjectSchema as FloatFilterObjectSchema } from './FloatFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema'

const attemptscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => AttemptScalarWhereInputObjectSchema), z.lazy(() => AttemptScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => AttemptScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => AttemptScalarWhereInputObjectSchema), z.lazy(() => AttemptScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  lessonId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  score: z.union([z.lazy(() => FloatFilterObjectSchema), z.number()]).optional(),
  maxScore: z.union([z.lazy(() => FloatFilterObjectSchema), z.number()]).optional(),
  attemptNumber: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  startedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  completedAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const AttemptScalarWhereInputObjectSchema: z.ZodType<Prisma.AttemptScalarWhereInput> = attemptscalarwhereinputSchema as unknown as z.ZodType<Prisma.AttemptScalarWhereInput>;
export const AttemptScalarWhereInputObjectZodSchema = attemptscalarwhereinputSchema;
