import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionCreateWithoutUserInputObjectSchema as sessionCreateWithoutUserInputObjectSchema } from './sessionCreateWithoutUserInput.schema';
import { sessionUncheckedCreateWithoutUserInputObjectSchema as sessionUncheckedCreateWithoutUserInputObjectSchema } from './sessionUncheckedCreateWithoutUserInput.schema';
import { sessionCreateOrConnectWithoutUserInputObjectSchema as sessionCreateOrConnectWithoutUserInputObjectSchema } from './sessionCreateOrConnectWithoutUserInput.schema';
import { sessionCreateManyUserInputEnvelopeObjectSchema as sessionCreateManyUserInputEnvelopeObjectSchema } from './sessionCreateManyUserInputEnvelope.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './sessionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => sessionCreateWithoutUserInputObjectSchema), z.lazy(() => sessionCreateWithoutUserInputObjectSchema).array(), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => sessionCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => sessionCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => sessionCreateManyUserInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => sessionWhereUniqueInputObjectSchema), z.lazy(() => sessionWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const sessionUncheckedCreateNestedManyWithoutUserInputObjectSchema: z.ZodType<Prisma.sessionUncheckedCreateNestedManyWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUncheckedCreateNestedManyWithoutUserInput>;
export const sessionUncheckedCreateNestedManyWithoutUserInputObjectZodSchema = makeSchema();
