import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAccountInputObjectSchema as userCreateWithoutAccountInputObjectSchema } from './userCreateWithoutAccountInput.schema';
import { userUncheckedCreateWithoutAccountInputObjectSchema as userUncheckedCreateWithoutAccountInputObjectSchema } from './userUncheckedCreateWithoutAccountInput.schema';
import { userCreateOrConnectWithoutAccountInputObjectSchema as userCreateOrConnectWithoutAccountInputObjectSchema } from './userCreateOrConnectWithoutAccountInput.schema';
import { userUpsertWithoutAccountInputObjectSchema as userUpsertWithoutAccountInputObjectSchema } from './userUpsertWithoutAccountInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutAccountInputObjectSchema as userUpdateToOneWithWhereWithoutAccountInputObjectSchema } from './userUpdateToOneWithWhereWithoutAccountInput.schema';
import { userUpdateWithoutAccountInputObjectSchema as userUpdateWithoutAccountInputObjectSchema } from './userUpdateWithoutAccountInput.schema';
import { userUncheckedUpdateWithoutAccountInputObjectSchema as userUncheckedUpdateWithoutAccountInputObjectSchema } from './userUncheckedUpdateWithoutAccountInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAccountInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAccountInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutAccountInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutAccountInputObjectSchema), z.lazy(() => userUpdateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAccountInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutAccountNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutAccountNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutAccountNestedInput>;
export const userUpdateOneRequiredWithoutAccountNestedInputObjectZodSchema = makeSchema();
