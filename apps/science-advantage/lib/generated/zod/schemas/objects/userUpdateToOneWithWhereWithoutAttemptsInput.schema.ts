import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutAttemptsInputObjectSchema as userUpdateWithoutAttemptsInputObjectSchema } from './userUpdateWithoutAttemptsInput.schema';
import { userUncheckedUpdateWithoutAttemptsInputObjectSchema as userUncheckedUpdateWithoutAttemptsInputObjectSchema } from './userUncheckedUpdateWithoutAttemptsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutAttemptsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAttemptsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutAttemptsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAttemptsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAttemptsInput>;
export const userUpdateToOneWithWhereWithoutAttemptsInputObjectZodSchema = makeSchema();
