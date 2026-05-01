import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema';
import { StringNullableWithAggregatesFilterObjectSchema as StringNullableWithAggregatesFilterObjectSchema } from './StringNullableWithAggregatesFilter.schema'

const sessionscalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => sessionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => sessionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => sessionScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => sessionScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => sessionScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  expiresAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  token: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  ipAddress: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  userAgent: z.union([z.lazy(() => StringNullableWithAggregatesFilterObjectSchema), z.string()]).optional().nullable(),
  userId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional()
}).strict();
export const sessionScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.sessionScalarWhereWithAggregatesInput> = sessionscalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.sessionScalarWhereWithAggregatesInput>;
export const sessionScalarWhereWithAggregatesInputObjectZodSchema = sessionscalarwherewithaggregatesinputSchema;
