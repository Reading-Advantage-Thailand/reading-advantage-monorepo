import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { StringNullableFilterObjectSchema as StringNullableFilterObjectSchema } from './StringNullableFilter.schema';
import { BoolFilterObjectSchema as BoolFilterObjectSchema } from './BoolFilter.schema';
import { EnumUserRoleFilterObjectSchema as EnumUserRoleFilterObjectSchema } from './EnumUserRoleFilter.schema';
import { UserRoleSchema } from '../enums/UserRole.schema';
import { IntNullableFilterObjectSchema as IntNullableFilterObjectSchema } from './IntNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema'

const userscalarwhereinputSchema = z.object({
  AND: z.union([z.lazy(() => userScalarWhereInputObjectSchema), z.lazy(() => userScalarWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => userScalarWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => userScalarWhereInputObjectSchema), z.lazy(() => userScalarWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  name: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  username: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  displayUsername: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  email: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  emailVerified: z.union([z.lazy(() => BoolFilterObjectSchema), z.boolean()]).optional(),
  image: z.union([z.lazy(() => StringNullableFilterObjectSchema), z.string()]).optional().nullable(),
  role: z.union([z.lazy(() => EnumUserRoleFilterObjectSchema), UserRoleSchema]).optional(),
  gradeLevel: z.union([z.lazy(() => IntNullableFilterObjectSchema), z.number().int()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const userScalarWhereInputObjectSchema: z.ZodType<Prisma.userScalarWhereInput> = userscalarwhereinputSchema as unknown as z.ZodType<Prisma.userScalarWhereInput>;
export const userScalarWhereInputObjectZodSchema = userscalarwhereinputSchema;
