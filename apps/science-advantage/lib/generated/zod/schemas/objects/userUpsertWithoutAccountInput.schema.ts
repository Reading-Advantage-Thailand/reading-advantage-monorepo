import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutAccountInputObjectSchema as userUpdateWithoutAccountInputObjectSchema } from './userUpdateWithoutAccountInput.schema';
import { userUncheckedUpdateWithoutAccountInputObjectSchema as userUncheckedUpdateWithoutAccountInputObjectSchema } from './userUncheckedUpdateWithoutAccountInput.schema';
import { userCreateWithoutAccountInputObjectSchema as userCreateWithoutAccountInputObjectSchema } from './userCreateWithoutAccountInput.schema';
import { userUncheckedCreateWithoutAccountInputObjectSchema as userUncheckedCreateWithoutAccountInputObjectSchema } from './userUncheckedCreateWithoutAccountInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAccountInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAccountInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutAccountInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutAccountInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutAccountInput>;
export const userUpsertWithoutAccountInputObjectZodSchema = makeSchema();
