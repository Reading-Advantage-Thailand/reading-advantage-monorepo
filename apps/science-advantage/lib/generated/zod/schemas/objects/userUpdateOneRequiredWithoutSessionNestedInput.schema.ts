import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutSessionInputObjectSchema as userCreateWithoutSessionInputObjectSchema } from './userCreateWithoutSessionInput.schema';
import { userUncheckedCreateWithoutSessionInputObjectSchema as userUncheckedCreateWithoutSessionInputObjectSchema } from './userUncheckedCreateWithoutSessionInput.schema';
import { userCreateOrConnectWithoutSessionInputObjectSchema as userCreateOrConnectWithoutSessionInputObjectSchema } from './userCreateOrConnectWithoutSessionInput.schema';
import { userUpsertWithoutSessionInputObjectSchema as userUpsertWithoutSessionInputObjectSchema } from './userUpsertWithoutSessionInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutSessionInputObjectSchema as userUpdateToOneWithWhereWithoutSessionInputObjectSchema } from './userUpdateToOneWithWhereWithoutSessionInput.schema';
import { userUpdateWithoutSessionInputObjectSchema as userUpdateWithoutSessionInputObjectSchema } from './userUpdateWithoutSessionInput.schema';
import { userUncheckedUpdateWithoutSessionInputObjectSchema as userUncheckedUpdateWithoutSessionInputObjectSchema } from './userUncheckedUpdateWithoutSessionInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutSessionInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutSessionInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutSessionInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutSessionInputObjectSchema), z.lazy(() => userUpdateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutSessionInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutSessionNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutSessionNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutSessionNestedInput>;
export const userUpdateOneRequiredWithoutSessionNestedInputObjectZodSchema = makeSchema();
