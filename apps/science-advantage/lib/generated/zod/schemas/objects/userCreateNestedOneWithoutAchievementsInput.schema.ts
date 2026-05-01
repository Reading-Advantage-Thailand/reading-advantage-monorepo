import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAchievementsInputObjectSchema as userCreateWithoutAchievementsInputObjectSchema } from './userCreateWithoutAchievementsInput.schema';
import { userUncheckedCreateWithoutAchievementsInputObjectSchema as userUncheckedCreateWithoutAchievementsInputObjectSchema } from './userUncheckedCreateWithoutAchievementsInput.schema';
import { userCreateOrConnectWithoutAchievementsInputObjectSchema as userCreateOrConnectWithoutAchievementsInputObjectSchema } from './userCreateOrConnectWithoutAchievementsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAchievementsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAchievementsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAchievementsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutAchievementsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutAchievementsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutAchievementsInput>;
export const userCreateNestedOneWithoutAchievementsInputObjectZodSchema = makeSchema();
