import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutMasteryRunInputObjectSchema as AttemptCreateWithoutMasteryRunInputObjectSchema } from './AttemptCreateWithoutMasteryRunInput.schema';
import { AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema as AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedCreateWithoutMasteryRunInput.schema';
import { AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema as AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema } from './AttemptCreateOrConnectWithoutMasteryRunInput.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutMasteryRunInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => AttemptCreateOrConnectWithoutMasteryRunInputObjectSchema).optional(),
  connect: z.lazy(() => AttemptWhereUniqueInputObjectSchema).optional()
}).strict();
export const AttemptCreateNestedOneWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptCreateNestedOneWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateNestedOneWithoutMasteryRunInput>;
export const AttemptCreateNestedOneWithoutMasteryRunInputObjectZodSchema = makeSchema();
