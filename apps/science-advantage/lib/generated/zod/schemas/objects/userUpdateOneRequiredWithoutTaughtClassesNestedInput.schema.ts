import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutTaughtClassesInputObjectSchema as userCreateWithoutTaughtClassesInputObjectSchema } from './userCreateWithoutTaughtClassesInput.schema';
import { userUncheckedCreateWithoutTaughtClassesInputObjectSchema as userUncheckedCreateWithoutTaughtClassesInputObjectSchema } from './userUncheckedCreateWithoutTaughtClassesInput.schema';
import { userCreateOrConnectWithoutTaughtClassesInputObjectSchema as userCreateOrConnectWithoutTaughtClassesInputObjectSchema } from './userCreateOrConnectWithoutTaughtClassesInput.schema';
import { userUpsertWithoutTaughtClassesInputObjectSchema as userUpsertWithoutTaughtClassesInputObjectSchema } from './userUpsertWithoutTaughtClassesInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutTaughtClassesInputObjectSchema as userUpdateToOneWithWhereWithoutTaughtClassesInputObjectSchema } from './userUpdateToOneWithWhereWithoutTaughtClassesInput.schema';
import { userUpdateWithoutTaughtClassesInputObjectSchema as userUpdateWithoutTaughtClassesInputObjectSchema } from './userUpdateWithoutTaughtClassesInput.schema';
import { userUncheckedUpdateWithoutTaughtClassesInputObjectSchema as userUncheckedUpdateWithoutTaughtClassesInputObjectSchema } from './userUncheckedUpdateWithoutTaughtClassesInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutTaughtClassesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutTaughtClassesInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutTaughtClassesInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUpdateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutTaughtClassesInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutTaughtClassesNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutTaughtClassesNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutTaughtClassesNestedInput>;
export const userUpdateOneRequiredWithoutTaughtClassesNestedInputObjectZodSchema = makeSchema();
