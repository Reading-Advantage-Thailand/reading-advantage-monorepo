import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutGamificationProfileInputObjectSchema as userCreateWithoutGamificationProfileInputObjectSchema } from './userCreateWithoutGamificationProfileInput.schema';
import { userUncheckedCreateWithoutGamificationProfileInputObjectSchema as userUncheckedCreateWithoutGamificationProfileInputObjectSchema } from './userUncheckedCreateWithoutGamificationProfileInput.schema';
import { userCreateOrConnectWithoutGamificationProfileInputObjectSchema as userCreateOrConnectWithoutGamificationProfileInputObjectSchema } from './userCreateOrConnectWithoutGamificationProfileInput.schema';
import { userUpsertWithoutGamificationProfileInputObjectSchema as userUpsertWithoutGamificationProfileInputObjectSchema } from './userUpsertWithoutGamificationProfileInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutGamificationProfileInputObjectSchema as userUpdateToOneWithWhereWithoutGamificationProfileInputObjectSchema } from './userUpdateToOneWithWhereWithoutGamificationProfileInput.schema';
import { userUpdateWithoutGamificationProfileInputObjectSchema as userUpdateWithoutGamificationProfileInputObjectSchema } from './userUpdateWithoutGamificationProfileInput.schema';
import { userUncheckedUpdateWithoutGamificationProfileInputObjectSchema as userUncheckedUpdateWithoutGamificationProfileInputObjectSchema } from './userUncheckedUpdateWithoutGamificationProfileInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutGamificationProfileInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutGamificationProfileInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutGamificationProfileInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUpdateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutGamificationProfileInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutGamificationProfileNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutGamificationProfileNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutGamificationProfileNestedInput>;
export const userUpdateOneRequiredWithoutGamificationProfileNestedInputObjectZodSchema = makeSchema();
