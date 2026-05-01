import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutMasteryRunsInputObjectSchema as userUpdateWithoutMasteryRunsInputObjectSchema } from './userUpdateWithoutMasteryRunsInput.schema';
import { userUncheckedUpdateWithoutMasteryRunsInputObjectSchema as userUncheckedUpdateWithoutMasteryRunsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRunsInput.schema';
import { userCreateWithoutMasteryRunsInputObjectSchema as userCreateWithoutMasteryRunsInputObjectSchema } from './userCreateWithoutMasteryRunsInput.schema';
import { userUncheckedCreateWithoutMasteryRunsInputObjectSchema as userUncheckedCreateWithoutMasteryRunsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRunsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRunsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRunsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutMasteryRunsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutMasteryRunsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutMasteryRunsInput>;
export const userUpsertWithoutMasteryRunsInputObjectZodSchema = makeSchema();
