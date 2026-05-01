import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutSessionInputObjectSchema as userCreateWithoutSessionInputObjectSchema } from './userCreateWithoutSessionInput.schema';
import { userUncheckedCreateWithoutSessionInputObjectSchema as userUncheckedCreateWithoutSessionInputObjectSchema } from './userUncheckedCreateWithoutSessionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutSessionInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutSessionInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutSessionInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutSessionInput>;
export const userCreateOrConnectWithoutSessionInputObjectZodSchema = makeSchema();
