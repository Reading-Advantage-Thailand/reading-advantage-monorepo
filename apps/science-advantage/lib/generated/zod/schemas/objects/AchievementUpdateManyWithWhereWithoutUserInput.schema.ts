import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementScalarWhereInputObjectSchema as AchievementScalarWhereInputObjectSchema } from './AchievementScalarWhereInput.schema';
import { AchievementUpdateManyMutationInputObjectSchema as AchievementUpdateManyMutationInputObjectSchema } from './AchievementUpdateManyMutationInput.schema';
import { AchievementUncheckedUpdateManyWithoutUserInputObjectSchema as AchievementUncheckedUpdateManyWithoutUserInputObjectSchema } from './AchievementUncheckedUpdateManyWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AchievementScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AchievementUpdateManyMutationInputObjectSchema), z.lazy(() => AchievementUncheckedUpdateManyWithoutUserInputObjectSchema)])
}).strict();
export const AchievementUpdateManyWithWhereWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementUpdateManyWithWhereWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUpdateManyWithWhereWithoutUserInput>;
export const AchievementUpdateManyWithWhereWithoutUserInputObjectZodSchema = makeSchema();
