import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema'

const verificationwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => verificationWhereInputObjectSchema), z.lazy(() => verificationWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => verificationWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => verificationWhereInputObjectSchema), z.lazy(() => verificationWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  identifier: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  value: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  expiresAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  createdAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  updatedAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable()
}).strict();
export const verificationWhereInputObjectSchema: z.ZodType<Prisma.verificationWhereInput> = verificationwhereinputSchema as unknown as z.ZodType<Prisma.verificationWhereInput>;
export const verificationWhereInputObjectZodSchema = verificationwhereinputSchema;
