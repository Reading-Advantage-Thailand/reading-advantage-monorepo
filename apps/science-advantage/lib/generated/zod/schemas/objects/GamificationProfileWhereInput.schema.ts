import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFilterObjectSchema as StringFilterObjectSchema } from './StringFilter.schema';
import { IntFilterObjectSchema as IntFilterObjectSchema } from './IntFilter.schema';
import { DateTimeNullableFilterObjectSchema as DateTimeNullableFilterObjectSchema } from './DateTimeNullableFilter.schema';
import { DateTimeFilterObjectSchema as DateTimeFilterObjectSchema } from './DateTimeFilter.schema';
import { UserScalarRelationFilterObjectSchema as UserScalarRelationFilterObjectSchema } from './UserScalarRelationFilter.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const gamificationprofilewhereinputSchema = z.object({
  AND: z.union([z.lazy(() => GamificationProfileWhereInputObjectSchema), z.lazy(() => GamificationProfileWhereInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => GamificationProfileWhereInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => GamificationProfileWhereInputObjectSchema), z.lazy(() => GamificationProfileWhereInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  userId: z.union([z.lazy(() => StringFilterObjectSchema), z.string()]).optional(),
  xp: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  level: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  streak: z.union([z.lazy(() => IntFilterObjectSchema), z.number().int()]).optional(),
  lastActiveAt: z.union([z.lazy(() => DateTimeNullableFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeFilterObjectSchema), z.coerce.date()]).optional(),
  user: z.union([z.lazy(() => UserScalarRelationFilterObjectSchema), z.lazy(() => userWhereInputObjectSchema)]).optional()
}).strict();
export const GamificationProfileWhereInputObjectSchema: z.ZodType<Prisma.GamificationProfileWhereInput> = gamificationprofilewhereinputSchema as unknown as z.ZodType<Prisma.GamificationProfileWhereInput>;
export const GamificationProfileWhereInputObjectZodSchema = gamificationprofilewhereinputSchema;
