import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './accountWhereUniqueInput.schema';
import { accountUpdateWithoutUserInputObjectSchema as accountUpdateWithoutUserInputObjectSchema } from './accountUpdateWithoutUserInput.schema';
import { accountUncheckedUpdateWithoutUserInputObjectSchema as accountUncheckedUpdateWithoutUserInputObjectSchema } from './accountUncheckedUpdateWithoutUserInput.schema';
import { accountCreateWithoutUserInputObjectSchema as accountCreateWithoutUserInputObjectSchema } from './accountCreateWithoutUserInput.schema';
import { accountUncheckedCreateWithoutUserInputObjectSchema as accountUncheckedCreateWithoutUserInputObjectSchema } from './accountUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => accountWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => accountUpdateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedUpdateWithoutUserInputObjectSchema)]),
  create: z.union([z.lazy(() => accountCreateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const accountUpsertWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.accountUpsertWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.accountUpsertWithWhereUniqueWithoutUserInput>;
export const accountUpsertWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
