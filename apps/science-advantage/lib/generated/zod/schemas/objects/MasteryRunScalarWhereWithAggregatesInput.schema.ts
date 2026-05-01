import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { EnumMasteryRunStatusWithAggregatesFilterObjectSchema as EnumMasteryRunStatusWithAggregatesFilterObjectSchema } from './EnumMasteryRunStatusWithAggregatesFilter.schema';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { StringNullableWithAggregatesFilterObjectSchema as StringNullableWithAggregatesFilterObjectSchema } from './StringNullableWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const masteryrunscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => MasteryRunScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => MasteryRunScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => MasteryRunScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => MasteryRunScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => MasteryRunScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  attemptId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  status: z.union([z.lazy(() => EnumMasteryRunStatusWithAggregatesFilterObjectSchema), MasteryRunStatusSchema]).optional(),
  updatedCount: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  lastError: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const MasteryRunScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.MasteryRunScalarWhereWithAggregatesInput> = masteryrunscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.MasteryRunScalarWhereWithAggregatesInput>;
export const MasteryRunScalarWhereWithAggregatesInputObjectZodSchema = masteryrunscalarwherewithaggregatesinputSchema;
