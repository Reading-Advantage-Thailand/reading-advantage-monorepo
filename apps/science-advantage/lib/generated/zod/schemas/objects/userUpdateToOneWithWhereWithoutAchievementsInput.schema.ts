import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutAchievementsInputObjectSchema as userUpdateWithoutAchievementsInputObjectSchema } from './userUpdateWithoutAchievementsInput.schema';
import { userUncheckedUpdateWithoutAchievementsInputObjectSchema as userUncheckedUpdateWithoutAchievementsInputObjectSchema } from './userUncheckedUpdateWithoutAchievementsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAchievementsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutAchievementsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAchievementsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAchievementsInput>;
export const userUpdateToOneWithWhereWithoutAchievementsInputObjectZodSchema = makeSchema();
