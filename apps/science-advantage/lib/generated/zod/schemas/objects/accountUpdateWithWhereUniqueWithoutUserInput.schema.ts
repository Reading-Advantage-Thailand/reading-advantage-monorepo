import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountWhereUniqueInputObjectSchema as accountWhereUniqueInputObjectSchema } from './accountWhereUniqueInput.schema';
import { accountUpdateWithoutUserInputObjectSchema as accountUpdateWithoutUserInputObjectSchema } from './accountUpdateWithoutUserInput.schema';
import { accountUncheckedUpdateWithoutUserInputObjectSchema as accountUncheckedUpdateWithoutUserInputObjectSchema } from './accountUncheckedUpdateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => accountWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => accountUpdateWithoutUserInputObjectSchema), z.lazy(() => accountUncheckedUpdateWithoutUserInputObjectSchema)])
}).strict();
export const accountUpdateWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.accountUpdateWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.accountUpdateWithWhereUniqueWithoutUserInput>;
export const accountUpdateWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
