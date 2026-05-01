import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumMasteryRunStatusFilterObjectSchema as EnumMasteryRunStatusFilterObjectSchema } from './EnumMasteryRunStatusFilter.schema';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { AttemptScalarRelationFilterObjectSchema as AttemptScalarRelationFilterObjectSchema } from './AttemptScalarRelationFilter.schema';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const masteryrunwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => MasteryRunWhereInputObjectSchema), z.lazy(() => MasteryRunWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => MasteryRunWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => MasteryRunWhereInputObjectSchema), z.lazy(() => MasteryRunWhereInputObjectSchema).array()]).optional(),
  attemptId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  status: z.union([z.lazy(() => EnumMasteryRunStatusFilterObjectSchema), MasteryRunStatusSchema]).optional(),
  updatedCount: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastError: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  attempt: z.union([z.lazy(() => AttemptScalarRelationFilterObjectSchema), z.lazy(() => AttemptWhereInputObjectSchema)]).optional(),
  student: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional()
}).strict();
export const MasteryRunWhereInputObjectSchema: z.ZodType<Prisma.MasteryRunWhereInput> = masteryrunwhereinputSchema as unknown as z.ZodType<Prisma.MasteryRunWhereInput>;
export const MasteryRunWhereInputObjectZodSchema = masteryrunwhereinputSchema;
