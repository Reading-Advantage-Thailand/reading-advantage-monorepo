import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutMasteryRunsInputObjectSchema as userCreateWithoutMasteryRunsInputObjectSchema } from './userCreateWithoutMasteryRunsInput.schema';
import { userUncheckedCreateWithoutMasteryRunsInputObjectSchema as userUncheckedCreateWithoutMasteryRunsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRunsInput.schema';
import { userCreateOrConnectWithoutMasteryRunsInputObjectSchema as userCreateOrConnectWithoutMasteryRunsInputObjectSchema } from './userCreateOrConnectWithoutMasteryRunsInput.schema';
import { userUpsertWithoutMasteryRunsInputObjectSchema as userUpsertWithoutMasteryRunsInputObjectSchema } from './userUpsertWithoutMasteryRunsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutMasteryRunsInputObjectSchema as userUpdateToOneWithWhereWithoutMasteryRunsInputObjectSchema } from './userUpdateToOneWithWhereWithoutMasteryRunsInput.schema';
import { userUpdateWithoutMasteryRunsInputObjectSchema as userUpdateWithoutMasteryRunsInputObjectSchema } from './userUpdateWithoutMasteryRunsInput.schema';
import { userUncheckedUpdateWithoutMasteryRunsInputObjectSchema as userUncheckedUpdateWithoutMasteryRunsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRunsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRunsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutMasteryRunsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutMasteryRunsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUpdateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRunsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutMasteryRunsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutMasteryRunsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutMasteryRunsNestedInput>;
export const userUpdateOneRequiredWithoutMasteryRunsNestedInputObjectZodSchema = makeSchema();
