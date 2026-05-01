import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutTaughtClassesInputObjectSchema as userUpdateWithoutTaughtClassesInputObjectSchema } from './userUpdateWithoutTaughtClassesInput.schema';
import { userUncheckedUpdateWithoutTaughtClassesInputObjectSchema as userUncheckedUpdateWithoutTaughtClassesInputObjectSchema } from './userUncheckedUpdateWithoutTaughtClassesInput.schema';
import { userCreateWithoutTaughtClassesInputObjectSchema as userCreateWithoutTaughtClassesInputObjectSchema } from './userCreateWithoutTaughtClassesInput.schema';
import { userUncheckedCreateWithoutTaughtClassesInputObjectSchema as userUncheckedCreateWithoutTaughtClassesInputObjectSchema } from './userUncheckedCreateWithoutTaughtClassesInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutTaughtClassesInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutTaughtClassesInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutTaughtClassesInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutTaughtClassesInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutTaughtClassesInput>;
export const userUpsertWithoutTaughtClassesInputObjectZodSchema = makeSchema();
