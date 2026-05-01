import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DecimalFilterObjectSchema as DecimalFilterObjectSchema } from './DecimalFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { StandardScalarRelationFilterObjectSchema as StandardScalarRelationFilterObjectSchema } from './StandardScalarRelationFilter.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './StandardWhereInput.schema'

const standardmasterywhereinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardMasteryWhereInputObjectSchema), z.lazy(() => StandardMasteryWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardMasteryWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardMasteryWhereInputObjectSchema), z.lazy(() => StandardMasteryWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  standardId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  masteryLevel: z.union([z.lazy(() => DecimalFilterObjectSchema), z.number()]).optional(),
  evidenceCount: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastAssessedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  student: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional(),
  standard: z.union([z.lazy(() => StandardScalarRelationFilterObjectSchema), z.lazy(() => StandardWhereInputObjectSchema)]).optional()
}).strict();
export const StandardMasteryWhereInputObjectSchema: z.ZodType<Prisma.StandardMasteryWhereInput> = standardmasterywhereinputSchema as unknown as z.ZodType<Prisma.StandardMasteryWhereInput>;
export const StandardMasteryWhereInputObjectZodSchema = standardmasterywhereinputSchema;
