import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAttemptsInputObjectSchema as userCreateWithoutAttemptsInputObjectSchema } from './userCreateWithoutAttemptsInput.schema';
import { userUncheckedCreateWithoutAttemptsInputObjectSchema as userUncheckedCreateWithoutAttemptsInputObjectSchema } from './userUncheckedCreateWithoutAttemptsInput.schema';
import { userCreateOrConnectWithoutAttemptsInputObjectSchema as userCreateOrConnectWithoutAttemptsInputObjectSchema } from './userCreateOrConnectWithoutAttemptsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAttemptsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAttemptsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutAttemptsInput>;
export const userCreateNestedOneWithoutAttemptsInputObjectZodSchema = makeSchema();
