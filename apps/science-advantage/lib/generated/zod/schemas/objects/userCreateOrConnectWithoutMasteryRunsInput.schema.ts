import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutMasteryRunsInputObjectSchema as userCreateWithoutMasteryRunsInputObjectSchema } from './userCreateWithoutMasteryRunsInput.schema';
import { userUncheckedCreateWithoutMasteryRunsInputObjectSchema as userUncheckedCreateWithoutMasteryRunsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRunsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRunsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutMasteryRunsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutMasteryRunsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutMasteryRunsInput>;
export const userCreateOrConnectWithoutMasteryRunsInputObjectZodSchema = makeSchema();
