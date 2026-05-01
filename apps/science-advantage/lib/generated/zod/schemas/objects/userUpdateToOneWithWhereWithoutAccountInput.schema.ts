import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutAccountInputObjectSchema as userUpdateWithoutAccountInputObjectSchema } from './userUpdateWithoutAccountInput.schema';
import { userUncheckedUpdateWithoutAccountInputObjectSchema as userUncheckedUpdateWithoutAccountInputObjectSchema } from './userUncheckedUpdateWithoutAccountInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutAccountInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutAccountInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutAccountInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAccountInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutAccountInput>;
export const userUpdateToOneWithWhereWithoutAccountInputObjectZodSchema = makeSchema();
