import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './GamificationProfileWhereUniqueInput.schema';
import { GamificationProfileCreateWithoutUserInputObjectSchema as GamificationProfileCreateWithoutUserInputObjectSchema } from './GamificationProfileCreateWithoutUserInput.schema';
import { GamificationProfileUncheckedCreateWithoutUserInputObjectSchema as GamificationProfileUncheckedCreateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedCreateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => GamificationProfileWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => GamificationProfileCreateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedCreateWithoutUserInputObjectSchema)])
}).strict();
export const GamificationProfileCreateOrConnectWithoutUserInputObjectSchema: z.ZodType<Prisma.GamificationProfileCreateOrConnectWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileCreateOrConnectWithoutUserInput>;
export const GamificationProfileCreateOrConnectWithoutUserInputObjectZodSchema = makeSchema();
