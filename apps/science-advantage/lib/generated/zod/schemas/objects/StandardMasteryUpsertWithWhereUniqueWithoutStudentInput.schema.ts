import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryUpdateWithoutStudentInputObjectSchema as StandardMasteryUpdateWithoutStudentInputObjectSchema } from './StandardMasteryUpdateWithoutStudentInput.schema';
import { StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema as StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedUpdateWithoutStudentInput.schema';
import { StandardMasteryCreateWithoutStudentInputObjectSchema as StandardMasteryCreateWithoutStudentInputObjectSchema } from './StandardMasteryCreateWithoutStudentInput.schema';
import { StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema as StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => StandardMasteryUpdateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateWithoutStudentInputObjectSchema)]),
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpsertWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpsertWithWhereUniqueWithoutStudentInput>;
export const StandardMasteryUpsertWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
