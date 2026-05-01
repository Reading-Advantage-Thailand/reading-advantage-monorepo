import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutSessionInputObjectSchema as userCreateWithoutSessionInputObjectSchema } from './userCreateWithoutSessionInput.schema';
import { userUncheckedCreateWithoutSessionInputObjectSchema as userUncheckedCreateWithoutSessionInputObjectSchema } from './userUncheckedCreateWithoutSessionInput.schema';
import { userCreateOrConnectWithoutSessionInputObjectSchema as userCreateOrConnectWithoutSessionInputObjectSchema } from './userCreateOrConnectWithoutSessionInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutSessionInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutSessionInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutSessionInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutSessionInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutSessionInput>;
export const userCreateNestedOneWithoutSessionInputObjectZodSchema = makeSchema();
