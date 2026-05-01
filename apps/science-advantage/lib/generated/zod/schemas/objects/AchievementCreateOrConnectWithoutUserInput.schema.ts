import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './AchievementWhereUniqueInput.schema';
import { AchievementCreateWithoutUserInputObjectSchema as AchievementCreateWithoutUserInputObjectSchema } from './AchievementCreateWithoutUserInput.schema';
import { AchievementUncheckedCreateWithoutUserInputObjectSchema as AchievementUncheckedCreateWithoutUserInputObjectSchema } from './AchievementUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AchievementWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AchievementCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const AchievementCreateOrConnectWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementCreateOrConnectWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateOrConnectWithoutUserInput>;
export const AchievementCreateOrConnectWithoutUserInputObjectZodSchema = makeSchema();
