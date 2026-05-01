import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DecimalFilterObjectSchema as DecimalFilterObjectSchema } from './DecimalFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const standardmasteryscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardMasteryScalarWhereInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardMasteryScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardMasteryScalarWhereInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  standardId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  masteryLevel: z.union([z.lazy(() => DecimalFilterObjectSchema), z.number()]).optional(),
  evidenceCount: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastAssessedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const StandardMasteryScalarWhereInputObjectSchema: z.ZodType<Prisma.StandardMasteryScalarWhereInput> = standardmasteryscalarwhereinputSchema as unknown as z.ZodType<Prisma.StandardMasteryScalarWhereInput>;
export const StandardMasteryScalarWhereInputObjectZodSchema = standardmasteryscalarwhereinputSchema;
