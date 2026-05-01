import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { DecimalWithAggregatesFilterObjectSchema as DecimalWithAggregatesFilterObjectSchema } from './DecimalWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const standardmasteryscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => StandardMasteryScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => StandardMasteryScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => StandardMasteryScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => StandardMasteryScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  studentId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  standardId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  masteryLevel: z.union([z.lazy(() => DecimalWithAggregatesFilterObjectSchema), z.number()]).optional(),
  evidenceCount: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  lastAssessedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const StandardMasteryScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.StandardMasteryScalarWhereWithAggregatesInput> = standardmasteryscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.StandardMasteryScalarWhereWithAggregatesInput>;
export const StandardMasteryScalarWhereWithAggregatesInputObjectZodSchema = standardmasteryscalarwherewithaggregatesinputSchema;
