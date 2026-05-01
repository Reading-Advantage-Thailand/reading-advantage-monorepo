import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereInputObjectSchema as StandardWhereInputObjectSchema } from './StandardWhereInput.schema';
import { StandardUpdateWithoutMasteryRecordsInputObjectSchema as StandardUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUpdateWithoutMasteryRecordsInput.schema';
import { StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema as StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema } from './StandardUncheckedUpdateWithoutMasteryRecordsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => StandardUpdateWithoutMasteryRecordsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutMasteryRecordsInputObjectSchema)])
}).strict();
export const StandardUpdateToOneWithWhereWithoutMasteryRecordsInputObjectSchema: z.ZodType<Prisma.StandardUpdateToOneWithWhereWithoutMasteryRecordsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateToOneWithWhereWithoutMasteryRecordsInput>;
export const StandardUpdateToOneWithWhereWithoutMasteryRecordsInputObjectZodSchema = makeSchema();
