import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutMasteryRunsInputObjectSchema as userUpdateWithoutMasteryRunsInputObjectSchema } from './userUpdateWithoutMasteryRunsInput.schema';
import { userUncheckedUpdateWithoutMasteryRunsInputObjectSchema as userUncheckedUpdateWithoutMasteryRunsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRunsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutMasteryRunsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRunsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutMasteryRunsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutMasteryRunsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutMasteryRunsInput>;
export const userUpdateToOneWithWhereWithoutMasteryRunsInputObjectZodSchema = makeSchema();
