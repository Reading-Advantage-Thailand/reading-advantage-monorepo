import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutSessionInputObjectSchema as userUpdateWithoutSessionInputObjectSchema } from './userUpdateWithoutSessionInput.schema';
import { userUncheckedUpdateWithoutSessionInputObjectSchema as userUncheckedUpdateWithoutSessionInputObjectSchema } from './userUncheckedUpdateWithoutSessionInput.schema';
import { userCreateWithoutSessionInputObjectSchema as userCreateWithoutSessionInputObjectSchema } from './userCreateWithoutSessionInput.schema';
import { userUncheckedCreateWithoutSessionInputObjectSchema as userUncheckedCreateWithoutSessionInputObjectSchema } from './userUncheckedCreateWithoutSessionInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutSessionInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutSessionInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutSessionInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutSessionInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutSessionInput>;
export const userUpsertWithoutSessionInputObjectZodSchema = makeSchema();
