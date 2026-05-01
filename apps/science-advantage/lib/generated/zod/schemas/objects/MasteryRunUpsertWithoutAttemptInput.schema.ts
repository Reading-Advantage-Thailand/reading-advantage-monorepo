import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunUpdateWithoutAttemptInputObjectSchema as MasteryRunUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUpdateWithoutAttemptInput.schema';
import { MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema as MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedUpdateWithoutAttemptInput.schema';
import { MasteryRunCreateWithoutAttemptInputObjectSchema as MasteryRunCreateWithoutAttemptInputObjectSchema } from './MasteryRunCreateWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateWithoutAttemptInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => MasteryRunUpdateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema)]),
  create: z.union([z.lazy(() => MasteryRunCreateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema)]),
  where: z.lazy(() => MasteryRunWhereInputObjectSchema).optional()
}).strict();
export const MasteryRunUpsertWithoutAttemptInputObjectSchema: z.ZodType<Prisma.MasteryRunUpsertWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpsertWithoutAttemptInput>;
export const MasteryRunUpsertWithoutAttemptInputObjectZodSchema = makeSchema();
