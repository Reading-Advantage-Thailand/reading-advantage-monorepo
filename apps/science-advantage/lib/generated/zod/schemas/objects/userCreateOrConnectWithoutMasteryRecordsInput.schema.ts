import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutMasteryRecordsInputObjectSchema as userCreateWithoutMasteryRecordsInputObjectSchema } from './userCreateWithoutMasteryRecordsInput.schema';
import { userUncheckedCreateWithoutMasteryRecordsInputObjectSchema as userUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './userUncheckedCreateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutMasteryRecordsInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutMasteryRecordsInput>;
export const userCreateOrConnectWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
