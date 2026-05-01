import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './AchievementWhereUniqueInput.schema';
import { AchievementUpdateWithoutUserInputObjectSchema as AchievementUpdateWithoutUserInputObjectSchema } from './AchievementUpdateWithoutUserInput.schema';
import { AchievementUncheckedUpdateWithoutUserInputObjectSchema as AchievementUncheckedUpdateWithoutUserInputObjectSchema } from './AchievementUncheckedUpdateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AchievementWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AchievementUpdateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedUpdateWithoutUserInputObjectSchema)])
}).strict();
export const AchievementUpdateWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementUpdateWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUpdateWithWhereUniqueWithoutUserInput>;
export const AchievementUpdateWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
