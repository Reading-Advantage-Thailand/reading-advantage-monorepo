import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithoutStudentInputObjectSchema as StandardMasteryUpdateWithoutStudentInputObjectSchema } from './StandardMasteryUpdateWithoutStudentInput.schema';
import { StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema as StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedUpdateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => StandardMasteryUpdateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema)])
}).strict();
export const StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateWithWhereUniqueWithoutStudentInput>;
export const StandardMasteryUpdateWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
