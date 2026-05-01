import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringWithAggregatesFilterObjectSchema as StringWithAggregatesFilterObjectSchema } from './StringWithAggregatesFilter.schema';
import { IntWithAggregatesFilterObjectSchema as IntWithAggregatesFilterObjectSchema } from './IntWithAggregatesFilter.schema';
import { DateTimeNullableWithAggregatesFilterObjectSchema as DateTimeNullableWithAggregatesFilterObjectSchema } from './DateTimeNullableWithAggregatesFilter.schema';
import { DateTimeWithAggregatesFilterObjectSchema as DateTimeWithAggregatesFilterObjectSchema } from './DateTimeWithAggregatesFilter.schema'

const gamificationprofilescalarwherewithaggregatesinputSchema = z.object({
  AND: z.union([z.lazy(() => GamificationProfileScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => GamificationProfileScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  OR: z.lazy(() => GamificationProfileScalarWhereWithAggregatesInputObjectSchema).array().optional(),
  NOT: z.union([z.lazy(() => GamificationProfileScalarWhereWithAggregatesInputObjectSchema), z.lazy(() => GamificationProfileScalarWhereWithAggregatesInputObjectSchema).array()]).optional(),
  id: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  userId: z.union([z.lazy(() => StringWithAggregatesFilterObjectSchema), z.string()]).optional(),
  xp: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  level: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  streak: z.union([z.lazy(() => IntWithAggregatesFilterObjectSchema), z.number().int()]).optional(),
  lastActiveAt: z.union([z.lazy(() => DateTimeNullableWithAggregatesFilterObjectSchema), z.coerce.date()]).optional().nullable(),
  createdAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional(),
  updatedAt: z.union([z.lazy(() => DateTimeWithAggregatesFilterObjectSchema), z.coerce.date()]).optional()
}).strict();
export const GamificationProfileScalarWhereWithAggregatesInputObjectSchema: z.ZodType<Prisma.GamificationProfileScalarWhereWithAggregatesInput> = gamificationprofilescalarwherewithaggregatesinputSchema as unknown as z.ZodType<Prisma.GamificationProfileScalarWhereWithAggregatesInput>;
export const GamificationProfileScalarWhereWithAggregatesInputObjectZodSchema = gamificationprofilescalarwherewithaggregatesinputSchema;
