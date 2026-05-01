import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptCreateWithoutMasteryRunInputObjectSchema as AttemptCreateWithoutMasteryRunInputObjectSchema } from './AttemptCreateWithoutMasteryRunInput.schema';
import { AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema as AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedCreateWithoutMasteryRunInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AttemptCreateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema)])
}).strict();
export const AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptCreateOrConnectWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateOrConnectWithoutMasteryRunInput>;
export const AttemptCreateOrConnectWithoutMasteryRunInputObjectZodSchema = makeSchema();
