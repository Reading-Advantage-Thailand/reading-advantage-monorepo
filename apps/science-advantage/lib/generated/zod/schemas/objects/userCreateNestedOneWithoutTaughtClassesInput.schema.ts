import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutTaughtClassesInputObjectSchema as userCreateWithoutTaughtClassesInputObjectSchema } from './userCreateWithoutTaughtClassesInput.schema';
import { userUncheckedCreateWithoutTaughtClassesInputObjectSchema as userUncheckedCreateWithoutTaughtClassesInputObjectSchema } from './userUncheckedCreateWithoutTaughtClassesInput.schema';
import { userCreateOrConnectWithoutTaughtClassesInputObjectSchema as userCreateOrConnectWithoutTaughtClassesInputObjectSchema } from './userCreateOrConnectWithoutTaughtClassesInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutTaughtClassesInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutTaughtClassesInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutTaughtClassesInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutTaughtClassesInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutTaughtClassesInput>;
export const userCreateNestedOneWithoutTaughtClassesInputObjectZodSchema = makeSchema();
