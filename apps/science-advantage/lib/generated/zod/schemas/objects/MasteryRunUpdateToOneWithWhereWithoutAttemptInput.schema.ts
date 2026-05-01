import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema';
import { MasteryRunUpdateWithoutAttemptInputObjectSchema as MasteryRunUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUpdateWithoutAttemptInput.schema';
import { MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema as MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedUpdateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => MasteryRunUpdateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema)])
}).strict();
export const MasteryRunUpdateToOneWithWhereWithoutAttemptInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateToOneWithWhereWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateToOneWithWhereWithoutAttemptInput>;
export const MasteryRunUpdateToOneWithWhereWithoutAttemptInputObjectZodSchema = makeSchema();
