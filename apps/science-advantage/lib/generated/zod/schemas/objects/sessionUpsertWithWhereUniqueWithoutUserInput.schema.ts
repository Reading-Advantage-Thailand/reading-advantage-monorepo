import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './sessionWhereUniqueInput.schema';
import { sessionUpdateWithoutUserInputObjectSchema as sessionUpdateWithoutUserInputObjectSchema } from './sessionUpdateWithoutUserInput.schema';
import { sessionUncheckedUpdateWithoutUserInputObjectSchema as sessionUncheckedUpdateWithoutUserInputObjectSchema } from './sessionUncheckedUpdateWithoutUserInput.schema';
import { sessionCreateWithoutUserInputObjectSchema as sessionCreateWithoutUserInputObjectSchema } from './sessionCreateWithoutUserInput.schema';
import { sessionUncheckedCreateWithoutUserInputObjectSchema as sessionUncheckedCreateWithoutUserInputObjectSchema } from './sessionUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => sessionWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => sessionUpdateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedUpdateWithoutUserInputObjectSchema)]),
  create: z.union([z.lazy(() => sessionCreateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const sessionUpsertWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.sessionUpsertWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUpsertWithWhereUniqueWithoutUserInput>;
export const sessionUpsertWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
