import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementCreateWithoutUserInputObjectSchema as AchievementCreateWithoutUserInputObjectSchema } from './AchievementCreateWithoutUserInput.schema';
import { AchievementUncheckedCreateWithoutUserInputObjectSchema as AchievementUncheckedCreateWithoutUserInputObjectSchema } from './AchievementUncheckedCreateWithoutUserInput.schema';
import { AchievementCreateOrConnectWithoutUserInputObjectSchema as AchievementCreateOrConnectWithoutUserInputObjectSchema } from './AchievementCreateOrConnectWithoutUserInput.schema';
import { AchievementUpsertWithWhereUniqueWithoutUserInputObjectSchema as AchievementUpsertWithWhereUniqueWithoutUserInputObjectSchema } from './AchievementUpsertWithWhereUniqueWithoutUserInput.schema';
import { AchievementCreateManyUserInputEnvelopeObjectSchema as AchievementCreateManyUserInputEnvelopeObjectSchema } from './AchievementCreateManyUserInputEnvelope.schema';
import { AchievementWhereUniqueInputObjectSchema as AchievementWhereUniqueInputObjectSchema } from './AchievementWhereUniqueInput.schema';
import { AchievementUpdateWithWhereUniqueWithoutUserInputObjectSchema as AchievementUpdateWithWhereUniqueWithoutUserInputObjectSchema } from './AchievementUpdateWithWhereUniqueWithoutUserInput.schema';
import { AchievementUpdateManyWithWhereWithoutUserInputObjectSchema as AchievementUpdateManyWithWhereWithoutUserInputObjectSchema } from './AchievementUpdateManyWithWhereWithoutUserInput.schema';
import { AchievementScalarWhereInputObjectSchema as AchievementScalarWhereInputObjectSchema } from './AchievementScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AchievementCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementCreateWithoutUserInputObjectSchema).array(), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => AchievementUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AchievementCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => AchievementCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AchievementUpsertWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => AchievementUpsertWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AchievementCreateManyUserInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AchievementWhereUniqueInputObjectSchema), z.lazy(() => AchievementWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AchievementWhereUniqueInputObjectSchema), z.lazy(() => AchievementWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AchievementWhereUniqueInputObjectSchema), z.lazy(() => AchievementWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AchievementWhereUniqueInputObjectSchema), z.lazy(() => AchievementWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AchievementUpdateWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => AchievementUpdateWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AchievementUpdateManyWithWhereWithoutUserInputObjectSchema), z.lazy(() => AchievementUpdateManyWithWhereWithoutUserInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AchievementScalarWhereInputObjectSchema), z.lazy(() => AchievementScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AchievementUpdateManyWithoutUserNestedInputObjectSchema: z.ZodType<Prisma.AchievementUpdateManyWithoutUserNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUpdateManyWithoutUserNestedInput>;
export const AchievementUpdateManyWithoutUserNestedInputObjectZodSchema = makeSchema();
