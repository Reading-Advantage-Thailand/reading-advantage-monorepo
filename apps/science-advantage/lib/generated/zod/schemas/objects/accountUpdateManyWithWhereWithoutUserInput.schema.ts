import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountScalarWhereInputObjectSchema as accountScalarWhereInputObjectSchema } from './accountScalarWhereInput.schema';
import { accountUpdateManyMutationInputObjectSchema as accountUpdateManyMutationInputObjectSchema } from './accountUpdateManyMutationInput.schema';
import { accountUncheckedUpdateManyWithoutUserInputObjectSchema as accountUncheckedUpdateManyWithoutUserInputObjectSchema } from './accountUncheckedUpdateManyWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => accountScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => accountUpdateManyMutationInputObjectSchema), z.lazy(() => accountUncheckedUpdateManyWithoutUserInputObjectSchema)])
}).strict();
export const accountUpdateManyWithWhereWithoutUserInputObjectSchema: z.ZodType<Prisma.accountUpdateManyWithWhereWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.accountUpdateManyWithWhereWithoutUserInput>;
export const accountUpdateManyWithWhereWithoutUserInputObjectZodSchema = makeSchema();
