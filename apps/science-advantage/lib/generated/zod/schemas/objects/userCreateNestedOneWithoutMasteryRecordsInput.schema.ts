import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutMasteryRecordsInputObjectSchema as userCreateWithoutMasteryRecordsInputObjectSchema } from './userCreateWithoutMasteryRecordsInput.schema';
import { userUncheckedCreateWithoutMasteryRecordsInputObjectSchema as userUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRecordsInput.schema';
import { userCreateOrConnectWithoutMasteryRecordsInputObjectSchema as userCreateOrConnectWithoutMasteryRecordsInputObjectSchema } from './userCreateOrConnectWithoutMasteryRecordsInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutMasteryRecordsInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutMasteryRecordsInput>;
export const userCreateNestedOneWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
