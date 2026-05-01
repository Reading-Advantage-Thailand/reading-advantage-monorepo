import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './sessionWhereUniqueInput.schema';
import { sessionUpdateWithoutUserInputObjectSchema as sessionUpdateWithoutUserInputObjectSchema } from './sessionUpdateWithoutUserInput.schema';
import { sessionUncheckedUpdateWithoutUserInputObjectSchema as sessionUncheckedUpdateWithoutUserInputObjectSchema } from './sessionUncheckedUpdateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => sessionWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => sessionUpdateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedUpdateWithoutUserInputObjectSchema)])
}).strict();
export const sessionUpdateWithWhereUniqueWithoutUserInputObjectSchema: z.ZodType<Prisma.sessionUpdateWithWhereUniqueWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUpdateWithWhereUniqueWithoutUserInput>;
export const sessionUpdateWithWhereUniqueWithoutUserInputObjectZodSchema = makeSchema();
