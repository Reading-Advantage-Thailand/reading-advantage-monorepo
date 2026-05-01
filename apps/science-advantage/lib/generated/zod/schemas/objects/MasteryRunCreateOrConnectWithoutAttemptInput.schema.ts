import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunCreateWithoutAttemptInputObjectSchema as MasteryRunCreateWithoutAttemptInputObjectSchema } from './MasteryRunCreateWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => MasteryRunCreateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema)])
}).strict();
export const MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema: z.ZodType<Prisma.MasteryRunCreateOrConnectWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateOrConnectWithoutAttemptInput>;
export const MasteryRunCreateOrConnectWithoutAttemptInputObjectZodSchema = makeSchema();
