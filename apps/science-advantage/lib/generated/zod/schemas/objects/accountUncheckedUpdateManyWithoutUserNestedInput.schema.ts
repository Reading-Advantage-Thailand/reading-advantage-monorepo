import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountCreateWithoutUserInputObjectSchema as accountCreateWithoutUserInputObjectSchema } from './accountCreateWithoutUserInput.schema';
import { accountUncheckedCreateWithoutUserInputObjectSchema as accountUncheckedCreateWithoutUserInputObjectSchema } from './accountUncheckedCreateWithoutUserInput.schema';
import { accountCreateOrConnectWithoutUserInputObjectSchema as accountCreateOrConnectWithoutUserInputObjectSchema } from './accountCreateOrConnectWithoutUserInput.schema';
import { accountUpsertWithWhereUniqueWithoutUserInputObjectSchema as accountUpsertWithWhereUniqueWithoutUserInputObjectSchema } from './accountUpsertWithWhereUniqueWithoutUserInput.schema';
import { accountCreateManyUserInputEnvelopeObjectSchema as accountCreateManyUserInputEnvelopeObjectSchema } from './accountCreateManyUserInputEnvelope.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './accountWhereUniqueInput.schema';
import { accountUpdateWithWhereUniqueWithoutUserInputObjectSchema as accountUpdateWithWhereUniqueWithoutUserInputObjectSchema } from './accountUpdateWithWhereUniqueWithoutUserInput.schema';
import { accountUpdateManyWithWhereWithoutUserInputObjectSchema as accountUpdateManyWithWhereWithoutUserInputObjectSchema } from './accountUpdateManyWithWhereWithoutUserInput.schema';
import { accountScalarWhereInputObjectSchema as accountScalarWhereInputObjectSchema } from './accountScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => accountCreateWithoutUserInputObjectSchema), z.lazy(() => accountCreateWithoutUserInputObjectSchema).array(), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => accountCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => accountCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => accountUpsertWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => accountUpsertWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => accountCreateManyUserInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => accountWhereUniqueInputObjectSchema), z.lazy(() => accountWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => accountWhereUniqueInputObjectSchema), z.lazy(() => accountWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => accountWhereUniqueInputObjectSchema), z.lazy(() => accountWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => accountWhereUniqueInputObjectSchema), z.lazy(() => accountWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => accountUpdateWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => accountUpdateWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => accountUpdateManyWithWhereWithoutUserInputObjectSchema), z.lazy(() => accountUpdateManyWithWhereWithoutUserInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => accountScalarWhereInputObjectSchema), z.lazy(() => accountScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const accountUncheckedUpdateManyWithoutUserNestedInputObjectSchema: z.ZodType<Prisma.accountUncheckedUpdateManyWithoutUserNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.accountUncheckedUpdateManyWithoutUserNestedInput>;
export const accountUncheckedUpdateManyWithoutUserNestedInputObjectZodSchema = makeSchema();
