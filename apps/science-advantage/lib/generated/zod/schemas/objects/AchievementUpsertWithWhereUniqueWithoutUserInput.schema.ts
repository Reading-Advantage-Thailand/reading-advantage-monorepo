import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './AchievementWhereUniqueInput.schema';
import { AchievementUpdateWithoutUserInputObjectSchema as AchievementUpdateWithoutUserInputObjectSchema } from './AchievementUpdateWithoutUserInput.schema';
import { AchievementUncheckedUpdateWithoutUserInputObjectSchema as AchievementUncheckedUpdateWithoutUserInputObjectSchema } from './AchievementUncheckedUpdateWithoutUserInput.schema';
import { AchievementCreateWithoutUserInputObjectSchema as AchievementCreateWithoutUserInputObjectSchema } from './AchievementCreateWithoutUserInput.schema';
import { AchievementUncheckedCreateWithoutUserInputObjectSchema as AchievementUncheckedCreateWithoutUserInputObjectSchema } from './AchievementUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AchievementWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AchievementUpdateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedUpdateWithoutUserInputObjectSchema)]),
  create: z.union([z.lazy(() => AchievementCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const AchievementUpsertWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementUpsertWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUpsertWithWhereUniqueWithoutUserInput>;
export const AchievementUpsertWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
