import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAttemptsInputObjectSchema as userCreateWithoutAttemptsInputObjectSchema } from './userCreateWithoutAttemptsInput.schema';
import { userUncheckedCreateWithoutAttemptsInputObjectSchema as userUncheckedCreateWithoutAttemptsInputObjectSchema } from './userUncheckedCreateWithoutAttemptsInput.schema';
import { userCreateOrConnectWithoutAttemptsInputObjectSchema as userCreateOrConnectWithoutAttemptsInputObjectSchema } from './userCreateOrConnectWithoutAttemptsInput.schema';
import { userUpsertWithoutAttemptsInputObjectSchema as userUpsertWithoutAttemptsInputObjectSchema } from './userUpsertWithoutAttemptsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutAttemptsInputObjectSchema as userUpdateToOneWithWhereWithoutAttemptsInputObjectSchema } from './userUpdateToOneWithWhereWithoutAttemptsInput.schema';
import { userUpdateWithoutAttemptsInputObjectSchema as userUpdateWithoutAttemptsInputObjectSchema } from './userUpdateWithoutAttemptsInput.schema';
import { userUncheckedUpdateWithoutAttemptsInputObjectSchema as userUncheckedUpdateWithoutAttemptsInputObjectSchema } from './userUncheckedUpdateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAttemptsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAttemptsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutAttemptsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutAttemptsInputObjectSchema), z.lazy(() => userUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAttemptsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutAttemptsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutAttemptsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutAttemptsNestedInput>;
export const userUpdateOneRequiredWithoutAttemptsNestedInputObjectZodSchema = makeSchema();
