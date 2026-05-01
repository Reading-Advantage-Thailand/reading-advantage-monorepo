import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutGamificationProfileInputObjectSchema as userUpdateWithoutGamificationProfileInputObjectSchema } from './userUpdateWithoutGamificationProfileInput.schema';
import { userUncheckedUpdateWithoutGamificationProfileInputObjectSchema as userUncheckedUpdateWithoutGamificationProfileInputObjectSchema } from './userUncheckedUpdateWithoutGamificationProfileInput.schema';
import { userCreateWithoutGamificationProfileInputObjectSchema as userCreateWithoutGamificationProfileInputObjectSchema } from './userCreateWithoutGamificationProfileInput.schema';
import { userUncheckedCreateWithoutGamificationProfileInputObjectSchema as userUncheckedCreateWithoutGamificationProfileInputObjectSchema } from './userUncheckedCreateWithoutGamificationProfileInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutGamificationProfileInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutGamificationProfileInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutGamificationProfileInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutGamificationProfileInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutGamificationProfileInput>;
export const userUpsertWithoutGamificationProfileInputObjectZodSchema = makeSchema();
