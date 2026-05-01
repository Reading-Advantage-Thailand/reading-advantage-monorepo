import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutTaughtClassesInputObjectSchema as userUpdateWithoutTaughtClassesInputObjectSchema } from './userUpdateWithoutTaughtClassesInput.schema';
import { userUncheckedUpdateWithoutTaughtClassesInputObjectSchema as userUncheckedUpdateWithoutTaughtClassesInputObjectSchema } from './userUncheckedUpdateWithoutTaughtClassesInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutTaughtClassesInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutTaughtClassesInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutTaughtClassesInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutTaughtClassesInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutTaughtClassesInput>;
export const userUpdateToOneWithWhereWithoutTaughtClassesInputObjectZodSchema = makeSchema();
