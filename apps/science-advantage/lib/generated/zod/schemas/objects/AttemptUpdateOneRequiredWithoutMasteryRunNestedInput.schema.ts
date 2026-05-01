import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutMasteryRunInputObjectSchema as AttemptCreateWithoutMasteryRunInputObjectSchema } from './AttemptCreateWithoutMasteryRunInput.schema';
import { AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema as AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedCreateWithoutMasteryRunInput.schema';
import { AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema as AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema } from './AttemptCreateOrConnectWithoutMasteryRunInput.schema';
import { AttemptUpsertWithoutMasteryRunInputObjectSchema as AttemptUpsertWithoutMasteryRunInputObjectSchema } from './AttemptUpsertWithoutMasteryRunInput.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateToOneWithWhereWithoutMasteryRunInputObjectSchema as AttemptUpdateToOneWithWhereWithoutMasteryRunInputObjectSchema } from './AttemptUpdateToOneWithWhereWithoutMasteryRunInput.schema';
import { AttemptUpdateWithoutMasteryRunInputObjectSchema as AttemptUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUpdateWithoutMasteryRunInput.schema';
import { AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema as AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedUpdateWithoutMasteryRunInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema).optional(),
  upsert: z.lazy(() => AttemptUpsertWithoutMasteryRunInputObjectSchema).optional(),
  connect: z.lazy(() => AttemptWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => AttemptUpdateToOneWithWhereWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUpdateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema)]).optional()
}).strict();
export const AttemptUpdateOneRequiredWithoutMasteryRunNestedInputObjectSchema: z.ZodType<Prisma.AttemptUpdateOneRequiredWithoutMasteryRunNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateOneRequiredWithoutMasteryRunNestedInput>;
export const AttemptUpdateOneRequiredWithoutMasteryRunNestedInputObjectZodSchema = makeSchema();
