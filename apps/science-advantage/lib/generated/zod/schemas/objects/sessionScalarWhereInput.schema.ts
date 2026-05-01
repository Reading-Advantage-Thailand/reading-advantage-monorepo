import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema'

const sessionscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => sessionScalarWhereInputObjectSchema), z.lazy(() => sessionScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => sessionScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => sessionScalarWhereInputObjectSchema), z.lazy(() => sessionScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  expiresAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  token: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  ipAddress: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  userAgent: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  userId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional()
}).strict();
export const sessionScalarWhereInputObjectSchema: z.ZodType<Prisma.sessionScalarWhereInput> = sessionscalarwhereinputSchema as unknown as z.ZodType<Prisma.sessionScalarWhereInput>;
export const sessionScalarWhereInputObjectZodSchema = sessionscalarwhereinputSchema;
