import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutAttemptsInputObjectSchema as userUpdateWithoutAttemptsInputObjectSchema } from './userUpdateWithoutAttemptsInput.schema';
import { userUncheckedUpdateWithoutAttemptsInputObjectSchema as userUncheckedUpdateWithoutAttemptsInputObjectSchema } from './userUncheckedUpdateWithoutAttemptsInput.schema';
import { userCreateWithoutAttemptsInputObjectSchema as userCreateWithoutAttemptsInputObjectSchema } from './userCreateWithoutAttemptsInput.schema';
import { userUncheckedCreateWithoutAttemptsInputObjectSchema as userUncheckedCreateWithoutAttemptsInputObjectSchema } from './userUncheckedCreateWithoutAttemptsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAttemptsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAttemptsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutAttemptsInput>;
export const userUpsertWithoutAttemptsInputObjectZodSchema = makeSchema();
