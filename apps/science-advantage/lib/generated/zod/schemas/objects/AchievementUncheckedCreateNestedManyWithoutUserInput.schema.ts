import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementCreateWithoutUserInputObjectSchema as AchievementCreateWithoutUserInputObjectSchema } from './AchievementCreateWithoutUserInput.schema';
import { AchievementUncheckedCreateWithoutUserInputObjectSchema as AchievementUncheckedCreateWithoutUserInputObjectSchema } from './AchievementUncheckedCreateWithoutUserInput.schema';
import { AchievementCreateOrConnectWithoutUserInputObjectSchema as AchievementCreateOrConnectWithoutUserInputObjectSchema } from './AchievementCreateOrConnectWithoutUserInput.schema';
import { AchievementCreateManyUserInputEnvelopeObjectSchema as AchievementCreateManyUserInputEnvelopeObjectSchema } from './AchievementCreateManyUserInputEnvelope.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './AchievementWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AchievementCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementCreateWithoutUserInputObjectSchema).array(), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AchievementCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => AchievementCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AchievementCreateManyUserInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AchievementWhereUniqueInputObjectSchema), z.lazy(() => AchievementWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AchievementUncheckedCreateNestedManyWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementUncheckedCreateNestedManyWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUncheckedCreateNestedManyWithoutUserInput>;
export const AchievementUncheckedCreateNestedManyWithoutUserInputObjectZodSchema = makeSchema();
