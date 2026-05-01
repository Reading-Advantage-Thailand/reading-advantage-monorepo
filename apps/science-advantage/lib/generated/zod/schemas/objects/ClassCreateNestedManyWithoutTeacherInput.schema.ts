import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateWithoutTeacherInputObjectSchema as ClassCreateWithoutTeacherInputObjectSchema } from './ClassCreateWithoutTeacherInput.schema';
import { ClassUncheckedCreateWithoutTeacherInputObjectSchema as ClassUncheckedCreateWithoutTeacherInputObjectSchema } from './ClassUncheckedCreateWithoutTeacherInput.schema';
import { ClassCreateOrConnectWithoutTeacherInputObjectSchema as ClassCreateOrConnectWithoutTeacherInputObjectSchema } from './ClassCreateOrConnectWithoutTeacherInput.schema';
import { ClassCreateManyTeacherInputEnvelopeObjectSchema as ClassCreateManyTeacherInputEnvelopeObjectSchema } from './ClassCreateManyTeacherInputEnvelope.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema).array(), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => ClassCreateOrConnectWithoutTeacherInputObjectSchema), z.lazy(() => ClassCreateOrConnectWithoutTeacherInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => ClassCreateManyTeacherInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => ClassWhereUniqueInputObjectSchema), z.lazy(() => ClassWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const ClassCreateNestedManyWithoutTeacherInputObjectSchema: z.ZodType<Prisma.ClassCreateNestedManyWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateNestedManyWithoutTeacherInput>;
export const ClassCreateNestedManyWithoutTeacherInputObjectZodSchema = makeSchema();
