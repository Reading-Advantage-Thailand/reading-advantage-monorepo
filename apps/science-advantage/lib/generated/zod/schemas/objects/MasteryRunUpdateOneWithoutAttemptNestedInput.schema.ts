import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunCreateWithoutAttemptInputObjectSchema as MasteryRunCreateWithoutAttemptInputObjectSchema } from './MasteryRunCreateWithoutAttemptInput.schema';
import { MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema as MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedCreateWithoutAttemptInput.schema';
import { MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema as MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema } from './MasteryRunCreateOrConnectWithoutAttemptInput.schema';
import { MasteryRunUpsertWithoutAttemptInputObjectSchema as MasteryRunUpsertWithoutAttemptInputObjectSchema } from './MasteryRunUpsertWithoutAttemptInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunUpdateToOneWithWhereWithoutAttemptInputObjectSchema as MasteryRunUpdateToOneWithWhereWithoutAttemptInputObjectSchema } from './MasteryRunUpdateToOneWithWhereWithoutAttemptInput.schema';
import { MasteryRunUpdateWithoutAttemptInputObjectSchema as MasteryRunUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUpdateWithoutAttemptInput.schema';
import { MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema as MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema } from './MasteryRunUncheckedUpdateWithoutAttemptInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => MasteryRunCreateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutAttemptInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => MasteryRunCreateOrConnectWithoutAttemptInputObjectSchema).optional(),
  upsert: z.lazy(() => MasteryRunUpsertWithoutAttemptInputObjectSchema).optional(),
  disconnect: z.union([z.boolean(), z.lazy(() => MasteryRunWhereInputObjectSchema)]).optional(),
  delete: z.union([z.boolean(), z.lazy(() => MasteryRunWhereInputObjectSchema)]).optional(),
  connect: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => MasteryRunUpdateToOneWithWhereWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUpdateWithoutAttemptInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateWithoutAttemptInputObjectSchema)]).optional()
}).strict();
export const MasteryRunUpdateOneWithoutAttemptNestedInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateOneWithoutAttemptNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateOneWithoutAttemptNestedInput>;
export const MasteryRunUpdateOneWithoutAttemptNestedInputObjectZodSchema = makeSchema();
