import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userUpdateWithoutMasteryRecordsInputObjectSchema as userUpdateWithoutMasteryRecordsInputObjectSchema } from './userUpdateWithoutMasteryRecordsInput.schema';
import { userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRecordsInput.schema';
import { userCreateWithoutMasteryRecordsInputObjectSchema as userCreateWithoutMasteryRecordsInputObjectSchema } from './userCreateWithoutMasteryRecordsInput.schema';
import { userUncheckedCreateWithoutMasteryRecordsInputObjectSchema as userUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRecordsInput.schema';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => userUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)]),
  create: z.union([z.lazy(() => userCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]),
  where: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const userUpsertWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.userUpsertWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpsertWithoutMasteryRecordsInput>;
export const userUpsertWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
