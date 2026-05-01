import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutAccountInputObjectSchema as userCreateWithoutAccountInputObjectSchema } from './userCreateWithoutAccountInput.schema';
import { userUncheckedCreateWithoutAccountInputObjectSchema as userUncheckedCreateWithoutAccountInputObjectSchema } from './userUncheckedCreateWithoutAccountInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutAccountInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutAccountInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutAccountInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutAccountInput>;
export const userCreateOrConnectWithoutAccountInputObjectZodSchema = makeSchema();
