import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptUpdateWithoutMasteryRunInputObjectSchema as AttemptUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUpdateWithoutMasteryRunInput.schema';
import { AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema as AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedUpdateWithoutMasteryRunInput.schema';
import { AttemptCreateWithoutMasteryRunInputObjectSchema as AttemptCreateWithoutMasteryRunInputObjectSchema } from './AttemptCreateWithoutMasteryRunInput.schema';
import { AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema as AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedCreateWithoutMasteryRunInput.schema';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => AttemptUpdateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema)]),
  create: z.union([z.lazy(() => AttemptCreateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema)]),
  where: z.lazy(() => AttemptWhereInputObjectSchema).optional()
}).strict();
export const AttemptUpsertWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptUpsertWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpsertWithoutMasteryRunInput>;
export const AttemptUpsertWithoutMasteryRunInputObjectZodSchema = makeSchema();
