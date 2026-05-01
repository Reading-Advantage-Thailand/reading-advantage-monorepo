import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutAchievementsInputObjectSchema as userCreateWithoutAchievementsInputObjectSchema } from './userCreateWithoutAchievementsInput.schema';
import { userUncheckedCreateWithoutAchievementsInputObjectSchema as userUncheckedCreateWithoutAchievementsInputObjectSchema } from './userUncheckedCreateWithoutAchievementsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAchievementsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutAchievementsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutAchievementsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutAchievementsInput>;
export const userCreateOrConnectWithoutAchievementsInputObjectZodSchema = makeSchema();
