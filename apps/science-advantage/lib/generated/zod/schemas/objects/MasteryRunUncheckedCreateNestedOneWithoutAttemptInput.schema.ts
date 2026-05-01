import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunCreateWithoutAttemptInputObjectSchema as MasteryRunCreateWithoutAttemptInputObjectSchema } from './MasteryRunCreateWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateWithoutAttemptInput.schema';
import { MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema as MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema } from './MasteryRunCreateOrConnectWithoutAttemptInput.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => MasteryRunCreateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema).optional(),
  connect: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).optional()
}).strict();
export const MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectSchema: z.ZodType<Prisma.MasteryRunUncheckedCreateNestedOneWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUncheckedCreateNestedOneWithoutAttemptInput>;
export const MasteryRunUncheckedCreateNestedOneWithoutAttemptInputObjectZodSchema = makeSchema();
