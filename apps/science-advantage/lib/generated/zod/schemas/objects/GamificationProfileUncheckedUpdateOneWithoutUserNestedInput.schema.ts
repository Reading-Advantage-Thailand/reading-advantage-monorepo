import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileCreateWithoutUserInputObjectSchema as GamificationProfileCreateWithoutUserInputObjectSchema } from './GamificationProfileCreateWithoutUserInput.schema';
import { GamificationProfileUncheckedCreateWithoutUserInputObjectSchema as GamificationProfileUncheckedCreateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedCreateWithoutUserInput.schema';
import { GamificationProfileCreateOrConnectWithoutUserInputObjectSchema as GamificationProfileCreateOrConnectWithoutUserInputObjectSchema } from './GamificationProfileCreateOrConnectWithoutUserInput.schema';
import { GamificationProfileUpsertWithoutUserInputObjectSchema as GamificationProfileUpsertWithoutUserInputObjectSchema } from './GamificationProfileUpsertWithoutUserInput.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './GamificationProfileWhereInput.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './GamificationProfileWhereUniqueInput.schema';
import { GamificationProfileUpdateToOneWithWhereWithoutUserInputObjectSchema as GamificationProfileUpdateToOneWithWhereWithoutUserInputObjectSchema } from './GamificationProfileUpdateToOneWithWhereWithoutUserInput.schema';
import { GamificationProfileUpdateWithoutUserInputObjectSchema as GamificationProfileUpdateWithoutUserInputObjectSchema } from './GamificationProfileUpdateWithoutUserInput.schema';
import { GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema as GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema } from './GamificationProfileUncheckedUpdateWithoutUserInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => GamificationProfileCreateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedCreateWithoutUserInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => GamificationProfileCreateOrConnectWithoutUserInputObjectSchema).optional(),
  upsert: z.lazy(() => GamificationProfileUpsertWithoutUserInputObjectSchema).optional(),
  disconnect: z.union([z.boolean(), z.lazy(() => GamificationProfileWhereInputObjectSchema)]).optional(),
  delete: z.union([z.boolean(), z.lazy(() => GamificationProfileWhereInputObjectSchema)]).optional(),
  connect: z.lazy(() => GamificationProfileWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => GamificationProfileUpdateToOneWithWhereWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUpdateWithoutUserInputObjectSchema), z.lazy(() => GamificationProfileUncheckedUpdateWithoutUserInputObjectSchema)]).optional()
}).strict();
export const GamificationProfileUncheckedUpdateOneWithoutUserNestedInputObjectSchema: z.ZodType<Prisma.GamificationProfileUncheckedUpdateOneWithoutUserNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileUncheckedUpdateOneWithoutUserNestedInput>;
export const GamificationProfileUncheckedUpdateOneWithoutUserNestedInputObjectZodSchema = makeSchema();
