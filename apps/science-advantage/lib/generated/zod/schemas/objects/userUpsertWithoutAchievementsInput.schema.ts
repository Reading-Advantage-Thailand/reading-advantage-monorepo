import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutAchievementsInputObjectSchema as userUpdateWithoutAchievementsInputObjectSchema } from './userUpdateWithoutAchievementsInput.schema';
import { userUncheckedUpdateWithoutAchievementsInputObjectSchema as userUncheckedUpdateWithoutAchievementsInputObjectSchema } from './userUncheckedUpdateWithoutAchievementsInput.schema';
import { userCreateWithoutAchievementsInputObjectSchema as userCreateWithoutAchievementsInputObjectSchema } from './userCreateWithoutAchievementsInput.schema';
import { userUncheckedCreateWithoutAchievementsInputObjectSchema as userUncheckedCreateWithoutAchievementsInputObjectSchema } from './userUncheckedCreateWithoutAchievementsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAchievementsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAchievementsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutAchievementsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutAchievementsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutAchievementsInput>;
export const userUpsertWithoutAchievementsInputObjectZodSchema = makeSchema();
