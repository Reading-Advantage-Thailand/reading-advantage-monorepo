import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileCreateWithoutUserInputObjectSchema as GamificationProfileCreateWithoutUserInputObjectSchema } from './GamificationProfileCreateWithoutUserInput.schema';
import { GamificationProfileUncheckedCreateWithoutUserInputObjectSchema as GamificationProfileUncheckedCreateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedCreateWithoutUserInput.schema';
import { GamificationProfileCreateOrConnectWithoutUserInputObjectSchema as GamificationProfileCreateOrConnectWithoutUserInputObjectSchema } from './GamificationProfileCreateOrConnectWithoutUserInput.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './GamificationProfileWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => GamificationProfileCreateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedCreateWithoutUserInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => GamificationProfileCreateOrConnectWithoutUserInputObjectSchema).optional(),
  connect: z.lazy(() => GamificationProfileWhereUniqueInputObjectSchema).optional()
}).strict();
export const GamificationProfileCreateNestedOneWithoutUserInputObjectSchema: z.ZodType<Prisma.GamificationProfileCreateNestedOneWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileCreateNestedOneWithoutUserInput>;
export const GamificationProfileCreateNestedOneWithoutUserInputObjectZodSchema = makeSchema();
