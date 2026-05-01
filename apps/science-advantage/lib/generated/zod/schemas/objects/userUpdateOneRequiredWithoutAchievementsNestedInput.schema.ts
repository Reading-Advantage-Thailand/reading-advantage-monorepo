import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAchievementsInputObjectSchema as userCreateWithoutAchievementsInputObjectSchema } from './userCreateWithoutAchievementsInput.schema';
import { userUncheckedCreateWithoutAchievementsInputObjectSchema as userUncheckedCreateWithoutAchievementsInputObjectSchema } from './userUncheckedCreateWithoutAchievementsInput.schema';
import { userCreateOrConnectWithoutAchievementsInputObjectSchema as userCreateOrConnectWithoutAchievementsInputObjectSchema } from './userCreateOrConnectWithoutAchievementsInput.schema';
import { userUpsertWithoutAchievementsInputObjectSchema as userUpsertWithoutAchievementsInputObjectSchema } from './userUpsertWithoutAchievementsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutAchievementsInputObjectSchema as userUpdateToOneWithWhereWithoutAchievementsInputObjectSchema } from './userUpdateToOneWithWhereWithoutAchievementsInput.schema';
import { userUpdateWithoutAchievementsInputObjectSchema as userUpdateWithoutAchievementsInputObjectSchema } from './userUpdateWithoutAchievementsInput.schema';
import { userUncheckedUpdateWithoutAchievementsInputObjectSchema as userUncheckedUpdateWithoutAchievementsInputObjectSchema } from './userUncheckedUpdateWithoutAchievementsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAchievementsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAchievementsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutAchievementsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutAchievementsInputObjectSchema), z.lazy(() => userUpdateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAchievementsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutAchievementsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutAchievementsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutAchievementsNestedInput>;
export const userUpdateOneRequiredWithoutAchievementsNestedInputObjectZodSchema = makeSchema();
