import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionScalarWhereInputObjectSchema as sessionScalarWhereInputObjectSchema } from './sessionScalarWhereInput.schema';
import { sessionUpdateManyMutationInputObjectSchema as sessionUpdateManyMutationInputObjectSchema } from './sessionUpdateManyMutationInput.schema';
import { sessionUncheckedUpdateManyWithoutUserInputObjectSchema as sessionUncheckedUpdateManyWithoutUserInputObjectSchema } from './sessionUncheckedUpdateManyWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => sessionScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => sessionUpdateManyMutationInputObjectSchema), z.lazy(() => sessionUncheckedUpdateManyWithoutUserInputObjectSchema)])
}).strict();
export const sessionUpdateManyWithWhereWithoutUserInputObjectSchema: z.ZodType<Prisma.sessionUpdateManyWithWhereWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUpdateManyWithWhereWithoutUserInput>;
export const sessionUpdateManyWithWhereWithoutUserInputObjectZodSchema = makeSchema();
