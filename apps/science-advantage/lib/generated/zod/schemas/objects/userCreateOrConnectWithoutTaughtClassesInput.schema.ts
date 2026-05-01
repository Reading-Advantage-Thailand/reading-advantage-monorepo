import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutTaughtClassesInputObjectSchema as userCreateWithoutTaughtClassesInputObjectSchema } from './userCreateWithoutTaughtClassesInput.schema';
import { userUncheckedCreateWithoutTaughtClassesInputObjectSchema as userUncheckedCreateWithoutTaughtClassesInputObjectSchema } from './userUncheckedCreateWithoutTaughtClassesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutTaughtClassesInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutTaughtClassesInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutTaughtClassesInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutTaughtClassesInput>;
export const userCreateOrConnectWithoutTaughtClassesInputObjectZodSchema = makeSchema();
