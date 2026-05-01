import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutMasteryRecordsInputObjectSchema as StandardCreateWithoutMasteryRecordsInputObjectSchema } from './StandardCreateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedCreateWithoutMasteryRecordsInput.schema';
import { StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema as StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema } from './StandardCreateOrConnectWithoutMasteryRecordsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema).optional(),
  connect: z.lazy(() => StandardWhereUniqueInputObjectSchema).optional()
}).strict();
export const StandardCreateNestedOneWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardCreateNestedOneWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateNestedOneWithoutMasteryRecordsInput>;
export const StandardCreateNestedOneWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
