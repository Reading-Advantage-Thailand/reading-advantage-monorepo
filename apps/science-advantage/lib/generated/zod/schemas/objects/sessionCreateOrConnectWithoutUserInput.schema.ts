import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './sessionWhereUniqueInput.schema';
import { sessionCreateWithoutUserInputObjectSchema as sessionCreateWithoutUserInputObjectSchema } from './sessionCreateWithoutUserInput.schema';
import { sessionUncheckedCreateWithoutUserInputObjectSchema as sessionUncheckedCreateWithoutUserInputObjectSchema } from './sessionUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => sessionWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => sessionCreateWithoutUserInputObjectSchema), z.lazy(() => sessionUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const sessionCreateOrConnectWithoutUserInputObjectSchema: z.ZodType<Prisma.sessionCreateOrConnectWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionCreateOrConnectWithoutUserInput>;
export const sessionCreateOrConnectWithoutUserInputObjectZodSchema = makeSchema();
