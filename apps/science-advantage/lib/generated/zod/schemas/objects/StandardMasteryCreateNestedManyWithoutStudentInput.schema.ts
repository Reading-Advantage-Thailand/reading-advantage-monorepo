import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryCreateWithoutStudentInputObjectSchema as StandardMasteryCreateWithoutStudentInputObjectSchema } from './StandardMasteryCreateWithoutStudentInput.schema';
import { StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema as StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedCreateWithoutStudentInput.schema';
import { StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema as StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema } from './StandardMasteryCreateOrConnectWithoutStudentInput.schema';
import { StandardMasteryCreateManyStudentInputEnvelopeObjectSchema as StandardMasteryCreateManyStudentInputEnvelopeObjectSchema } from './StandardMasteryCreateManyStudentInputEnvelope.schema';
import { StandardMasteryWhereUniqueInputObjectSchema as StandardMasteryWhereUniqueInputObjectSchema } from './StandardMasteryWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => StandardMasteryCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => StandardMasteryCreateManyStudentInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema), z.lazy(() => StandardMasteryWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const StandardMasteryCreateNestedManyWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateNestedManyWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateNestedManyWithoutStudentInput>;
export const StandardMasteryCreateNestedManyWithoutStudentInputObjectZodSchema = makeSchema();
