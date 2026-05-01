import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountCreateWithoutUserInputObjectSchema as accountCreateWithoutUserInputObjectSchema } from './accountCreateWithoutUserInput.schema';
import { accountUncheckedCreateWithoutUserInputObjectSchema as accountUncheckedCreateWithoutUserInputObjectSchema } from './accountUncheckedCreateWithoutUserInput.schema';
import { accountCreateOrConnectWithoutUserInputObjectSchema as accountCreateOrConnectWithoutUserInputObjectSchema } from './accountCreateOrConnectWithoutUserInput.schema';
import { accountCreateManyUserInputEnvelopeObjectSchema as accountCreateManyUserInputEnvelopeObjectSchema } from './accountCreateManyUserInputEnvelope.schema';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './accountWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => accountCreateWithoutUserInputObjectSchema), z.lazy(() => accountCreateWithoutUserInputObjectSchema).array(), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => accountCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => accountCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => accountCreateManyUserInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => accountWhereUniqueInputObjectSchema), z.lazy(() => accountWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const accountCreateNestedManyWithoutUserInputObjectSchema: z.ZodType<Prisma.accountCreateNestedManyWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.accountCreateNestedManyWithoutUserInput>;
export const accountCreateNestedManyWithoutUserInputObjectZodSchema = makeSchema();
