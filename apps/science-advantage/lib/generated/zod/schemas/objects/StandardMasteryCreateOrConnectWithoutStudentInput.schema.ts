import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema';
import { StandardMasteryCreateWithoutStudentInputObjectSchema as StandardMasteryCreateWithoutStudentInputObjectSchema } from './StandardMasteryCreateWithoutStudentInput.schema';
import { StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema as StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateOrConnectWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateOrConnectWithoutStudentInput>;
export const StandardMasteryCreateOrConnectWithoutStudentInputObjectZodSchema = makeSchema();
