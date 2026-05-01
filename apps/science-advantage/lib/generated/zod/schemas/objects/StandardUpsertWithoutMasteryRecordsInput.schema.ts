import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardUpdateWithoutMasteryRecordsInputObjectSchema as StandardUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUpdateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedUpdateWithoutMasteryRecordsInput.schema';
import { StandardCreateWithoutMasteryRecordsInputObjectSchema as StandardCreateWithoutMasteryRecordsInputObjectSchema } from './StandardCreateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedCreateWithoutMasteryRecordsInput.schema';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './StandardWhereInput.schema'

const makeSchema = () => z.object({
  update: z.union([z.lazy(() => StandardUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)]),
  create: z.union([z.lazy(() => StandardCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]),
  where: z.lazy(() => StandardWhereInputObjectSchema).optional()
}).strict();
export const StandardUpsertWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardUpsertWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpsertWithoutMasteryRecordsInput>;
export const StandardUpsertWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
