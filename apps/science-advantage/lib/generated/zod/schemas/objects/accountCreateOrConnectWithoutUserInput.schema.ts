import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './accountWhereUniqueInput.schema';
import { accountCreateWithoutUserInputObjectSchema as accountCreateWithoutUserInputObjectSchema } from './accountCreateWithoutUserInput.schema';
import { accountUncheckedCreateWithoutUserInputObjectSchema as accountUncheckedCreateWithoutUserInputObjectSchema } from './accountUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => accountWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => accountCreateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const accountCreateOrConnectWithoutUserInputObjectSchema: z.ZodType<Prisma.accountCreateOrConnectWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.accountCreateOrConnectWithoutUserInput>;
export const accountCreateOrConnectWithoutUserInputObjectZodSchema = makeSchema();
