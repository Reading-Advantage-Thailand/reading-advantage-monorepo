import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { EnumMasteryRunStatusFilterObjectSchema as EnumMasteryRunStatusFilterObjectSchema } from './EnumMasteryRunStatusFilter.schema';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const masteryrunscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => MasteryRunScalarWhereInputObjectSchema), z.lazy(() => MasteryRunScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => MasteryRunScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => MasteryRunScalarWhereInputObjectSchema), z.lazy(() => MasteryRunScalarWhereInputObjectSchema).array()]).optional(),
  attemptId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  status: z.union([z.lazy(() => EnumMasteryRunStatusFilterObjectSchema), MasteryRunStatusSchema]).optional(),
  updatedCount: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastError: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const MasteryRunScalarWhereInputObjectSchema: z.ZodType<Prisma.MasteryRunScalarWhereInput> = masteryrunscalarwhereinputSchema as unknown as z.ZodType<Prisma.MasteryRunScalarWhereInput>;
export const MasteryRunScalarWhereInputObjectZodSchema = masteryrunscalarwhereinputSchema;
