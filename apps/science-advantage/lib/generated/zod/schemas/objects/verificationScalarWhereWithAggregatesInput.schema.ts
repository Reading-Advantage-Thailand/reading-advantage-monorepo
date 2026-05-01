import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema';
import { DateTimeNullableWithAggregatesFilterObjectSchema as DateTimeNullableWithAggregatesFilterObjectSchema } from './DateTimeNullableWithAggregatesFilter.schema'

const verificationscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => verificationScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => verificationScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => verificationScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => verificationScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => verificationScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  identifier: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  value: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  expiresAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeNullableWithAggregatesFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  updatedAt: z.union([z.lazy(() => DateTimeNullableWithAggregatesFilterObjectSchema), z.coerce.date()]).optional().nullable()
}).strict();
export const verificationScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.verificationScalarWhereWithAggregatesInput> = verificationscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.verificationScalarWhereWithAggregatesInput>;
export const verificationScalarWhereWithAggregatesInputObjectZodSchema = verificationscalarwherewithaggregatesinputSchema;
