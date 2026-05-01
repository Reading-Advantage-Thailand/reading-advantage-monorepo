import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutMasteryRecordsInputObjectSchema as userCreateWithoutMasteryRecordsInputObjectSchema } from './userCreateWithoutMasteryRecordsInput.schema';
import { userUncheckedCreateWithoutMasteryRecordsInputObjectSchema as userUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRecordsInput.schema';
import { userCreateOrConnectWithoutMasteryRecordsInputObjectSchema as userCreateOrConnectWithoutMasteryRecordsInputObjectSchema } from './userCreateOrConnectWithoutMasteryRecordsInput.schema';
import { userUpsertWithoutMasteryRecordsInputObjectSchema as userUpsertWithoutMasteryRecordsInputObjectSchema } from './userUpsertWithoutMasteryRecordsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema as userUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema } from './userUpdateToOneWithWhereWithoutMasteryRecordsInput.schema';
import { userUpdateWithoutMasteryRecordsInputObjectSchema as userUpdateWithoutMasteryRecordsInputObjectSchema } from './userUpdateWithoutMasteryRecordsInput.schema';
import { userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedUpdateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutMasteryRecordsInputObjectSchema).optional(),
  upsert: z.lazy(() => userUpsertWithoutMasteryRecordsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => userUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)]).optional()
}).strict();
export const userUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema: z.ZodType<Prisma.userUpdateOneRequiredWithoutMasteryRecordsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.userUpdateOneRequiredWithoutMasteryRecordsNestedInput>;
export const userUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectZodSchema = makeSchema();
