import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './GamificationProfileWhereInput.schema';
import { GamificationProfileUpdateWithoutUserInputObjectSchema as GamificationProfileUpdateWithoutUserInputObjectSchema } from './GamificationProfileUpdateWithoutUserInput.schema';
import { GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema as GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedUpdateWithoutUserInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => GamificationProfileWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => GamificationProfileUpdateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema)])
}).strict();
export const GamificationProfileUpdateToOneWithWhereWithoutUserInputObjectSchema: z.ZodType<Prisma.GamificationProfileUpdateToOneWithWhereWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileUpdateToOneWithWhereWithoutUserInput>;
export const GamificationProfileUpdateToOneWithWhereWithoutUserInputObjectZodSchema = makeSchema();
