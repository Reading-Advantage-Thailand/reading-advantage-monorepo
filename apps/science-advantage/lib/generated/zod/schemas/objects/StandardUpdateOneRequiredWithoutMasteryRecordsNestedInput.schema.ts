import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutMasteryRecordsInputObjectSchema as StandardCreateWithoutMasteryRecordsInputObjectSchema } from './StandardCreateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedCreateWithoutMasteryRecordsInput.schema';
import { StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema as StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema } from './StandardCreateOrConnectWithoutMasteryRecordsInput.schema';
import { StandardUpsertWithoutMasteryRecordsInputObjectSchema as StandardUpsertWithoutMasteryRecordsInputObjectSchema } from './StandardUpsertWithoutMasteryRecordsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema as StandardUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema } from './StandardUpdateToOneWithWhereWithoutMasteryRecordsInput.schema';
import { StandardUpdateWithoutMasteryRecordsInputObjectSchema as StandardUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUpdateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedUpdateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutMasteryRecordsInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => StandardCreateOrConnectWithoutMasteryRecordsInputObjectSchema).optional(),
  upsert: z.lazy(() => StandardUpsertWithoutMasteryRecordsInputObjectSchema).optional(),
  connect: z.lazy(() => StandardWhereUniqueInputObjectSchema).optional(),
  update: z.union([z.lazy(() => StandardUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)]).optional()
}).strict();
export const StandardUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectSchema: z.ZodType<Prisma.StandardUpdateOneRequiredWithoutMasteryRecordsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateOneRequiredWithoutMasteryRecordsNestedInput>;
export const StandardUpdateOneRequiredWithoutMasteryRecordsNestedInputObjectZodSchema = makeSchema();
