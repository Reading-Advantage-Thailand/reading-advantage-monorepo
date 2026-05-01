import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutAttemptsInputObjectSchema as userCreateWithoutAttemptsInputObjectSchema } from './userCreateWithoutAttemptsInput.schema';
import { userUncheckedCreateWithoutAttemptsInputObjectSchema as userUncheckedCreateWithoutAttemptsInputObjectSchema } from './userUncheckedCreateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAttemptsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutAttemptsInput>;
export const userCreateOrConnectWithoutAttemptsInputObjectZodSchema = makeSchema();
