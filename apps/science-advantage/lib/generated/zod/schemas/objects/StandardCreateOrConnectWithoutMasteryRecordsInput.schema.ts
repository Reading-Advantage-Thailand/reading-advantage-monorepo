import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardCreateWithoutMasteryRecordsInputObjectSchema as StandardCreateWithoutMasteryRecordsInputObjectSchema } from './StandardCreateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedCreateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => StandardCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema)])
}).strict();
export const StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardCreateOrConnectWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateOrConnectWithoutMasteryRecordsInput>;
export const StandardCreateOrConnectWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
