import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema';
import { userUpdateWithoutMasteryRecordsInputObjectSchema as userUpdateWithoutMasteryRecordsInputObjectSchema } from './userUpdateWithoutMasteryRecordsInput.schema';
import { userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => userUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)])
}).strict();
export const userUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.userUpdateToOneWithWhereWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateToOneWithWhereWithoutMasteryRecordsInput>;
export const userUpdateToOneWithWhereWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
