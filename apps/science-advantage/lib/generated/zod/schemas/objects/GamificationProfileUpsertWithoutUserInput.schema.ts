import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileUpdateWithoutUserInputObjectSchema as GamificationProfileUpdateWithoutUserInputObjectSchema } from './GamificationProfileUpdateWithoutUserInput.schema';
import { GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema as GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedUpdateWithoutUserInput.schema';
import { GamificationProfileCreateWithoutUserInputObjectSchema as GamificationProfileCreateWithoutUserInputObjectSchema } from './GamificationProfileCreateWithoutUserInput.schema';
import { GamificationProfileUncheckedCreateWithoutUserInputObjectSchema as GamificationProfileUncheckedCreateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedCreateWithoutUserInput.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './GamificationProfileWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => GamificationProfileUpdateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema)]),
  create: z.union([z.lazy(() => GamificationProfileCreateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedCreateWithoutUserInputObjectSchema)]),
  where: z.lazy(() => GamificationProfileWhereInputObjectSchema).optional()
}).strict();
export const GamificationProfileUpsertWithoutUserInputObjectSchema: z.ZodType<Prisma.GamificationProfileUpsertWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileUpsertWithoutUserInput>;
export const GamificationProfileUpsertWithoutUserInputObjectZodSchema = makeSchema();
