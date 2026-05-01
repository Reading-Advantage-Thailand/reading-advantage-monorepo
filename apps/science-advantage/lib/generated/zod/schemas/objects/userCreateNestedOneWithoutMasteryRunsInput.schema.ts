import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutMasteryRunsInputObjectSchema as userCreateWithoutMasteryRunsInputObjectSchema } from './userCreateWithoutMasteryRunsInput.schema';
import { userUncheckedCreateWithoutMasteryRunsInputObjectSchema as userUncheckedCreateWithoutMasteryRunsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRunsInput.schema';
import { userCreateOrConnectWithoutMasteryRunsInputObjectSchema as userCreateOrConnectWithoutMasteryRunsInputObjectSchema } from './userCreateOrConnectWithoutMasteryRunsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRunsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutMasteryRunsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutMasteryRunsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutMasteryRunsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutMasteryRunsInput>;
export const userCreateNestedOneWithoutMasteryRunsInputObjectZodSchema = makeSchema();
