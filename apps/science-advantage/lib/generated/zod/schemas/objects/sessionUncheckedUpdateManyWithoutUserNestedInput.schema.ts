import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionCreateWithoutUserInputObjectSchema as sessionCreateWithoutUserInputObjectSchema } from './sessionCreateWithoutUserInput.schema';
import { sessionUncheckedCreateWithoutUserInputObjectSchema as sessionUncheckedCreateWithoutUserInputObjectSchema } from './sessionUncheckedCreateWithoutUserInput.schema';
import { sessionCreateOrConnectWithoutUserInputObjectSchema as sessionCreateOrConnectWithoutUserInputObjectSchema } from './sessionCreateOrConnectWithoutUserInput.schema';
import { sessionUpsertWithWhereUniqueWithoutUserInputObjectSchema as sessionUpsertWithWhereUniqueWithoutUserInputObjectSchema } from './sessionUpsertWithWhereUniqueWithoutUserInput.schema';
import { sessionCreateManyUserInputEnvelopeObjectSchema as sessionCreateManyUserInputEnvelopeObjectSchema } from './sessionCreateManyUserInputEnvelope.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './sessionWhereUniqueInput.schema';
import { sessionUpdateWithWhereUniqueWithoutUserInputObjectSchema as sessionUpdateWithWhereUniqueWithoutUserInputObjectSchema } from './sessionUpdateWithWhereUniqueWithoutUserInput.schema';
import { sessionUpdateManyWithWhereWithoutUserInputObjectSchema as sessionUpdateManyWithWhereWithoutUserInputObjectSchema } from './sessionUpdateManyWithWhereWithoutUserInput.schema';
import { sessionScalarWhereInputObjectSchema as sessionScalarWhereInputObjectSchema } from './sessionScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => sessionCreateWithoutUserInputObjectSchema), z.lazy(() => sessionCreateWithoutUserInputObjectSchema).array(), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => sessionCreateOrConnectWithoutUserInputObjectSchema), z.lazy(() => sessionCreateOrConnectWithoutUserInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => sessionUpsertWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => sessionUpsertWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => sessionCreateManyUserInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => sessionWhereUniqueInputObjectSchema), z.lazy(() => sessionWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => sessionWhereUniqueInputObjectSchema), z.lazy(() => sessionWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => sessionWhereUniqueInputObjectSchema), z.lazy(() => sessionWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => sessionWhereUniqueInputObjectSchema), z.lazy(() => sessionWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => sessionUpdateWithWhereUniqueWithoutUserInputObjectSchema), z.lazy(() => sessionUpdateWithWhereUniqueWithoutUserInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => sessionUpdateManyWithWhereWithoutUserInputObjectSchema), z.lazy(() => sessionUpdateManyWithWhereWithoutUserInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => sessionScalarWhereInputObjectSchema), z.lazy(() => sessionScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const sessionUncheckedUpdateManyWithoutUserNestedInputObjectSchema: z.ZodType<Prisma.sessionUncheckedUpdateManyWithoutUserNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUncheckedUpdateManyWithoutUserNestedInput>;
export const sessionUncheckedUpdateManyWithoutUserNestedInputObjectZodSchema = makeSchema();
