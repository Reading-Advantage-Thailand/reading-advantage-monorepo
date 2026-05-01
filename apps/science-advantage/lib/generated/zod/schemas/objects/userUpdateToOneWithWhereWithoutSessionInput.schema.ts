import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutSessionInputObjectSchema as userUpdateWithoutSessionInputObjectSchema } from './userUpdateWithoutSessionInput.schema';
import { userUncheckedUpdateWithoutSessionInputObjectSchema as userUncheckedUpdateWithoutSessionInputObjectSchema } from './userUncheckedUpdateWithoutSessionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutSessionInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutSessionInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutSessionInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutSessionInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutSessionInput>;
export const userUpdateToOneWithWhereWithoutSessionInputObjectZodSchema = makeSchema();
