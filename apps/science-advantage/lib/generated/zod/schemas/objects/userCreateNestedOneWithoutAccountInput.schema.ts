import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutAccountInputObjectSchema as userCreateWithoutAccountInputObjectSchema } from './userCreateWithoutAccountInput.schema';
import { userUncheckedCreateWithoutAccountInputObjectSchema as userUncheckedCreateWithoutAccountInputObjectSchema } from './userUncheckedCreateWithoutAccountInput.schema';
import { userCreateOrConnectWithoutAccountInputObjectSchema as userCreateOrConnectWithoutAccountInputObjectSchema } from './userCreateOrConnectWithoutAccountInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAccountInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutAccountInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutAccountInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutAccountInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutAccountInput>;
export const userCreateNestedOneWithoutAccountInputObjectZodSchema = makeSchema();
