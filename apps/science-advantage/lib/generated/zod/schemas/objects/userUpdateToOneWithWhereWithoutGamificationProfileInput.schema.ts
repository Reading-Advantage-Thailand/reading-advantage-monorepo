import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutGamificationProfileInputObjectSchema as userUpdateWithoutGamificationProfileInputObjectSchema } from './userUpdateWithoutGamificationProfileInput.schema';
import { userUncheckedUpdateWithoutGamificationProfileInputObjectSchema as userUncheckedUpdateWithoutGamificationProfileInputObjectSchema } from './userUncheckedUpdateWithoutGamificationProfileInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutGamificationProfileInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutGamificationProfileInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutGamificationProfileInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutGamificationProfileInput>;
export const userUpdateToOneWithWhereWithoutGamificationProfileInputObjectZodSchema = makeSchema();
