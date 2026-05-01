import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './ClassWhereUniqueInput.schema';
import { ClassCreateWithoutTeacherInputObjectSchema as ClassCreateWithoutTeacherInputObjectSchema } from './ClassCreateWithoutTeacherInput.schema';
import { ClassUncheckedCreateWithoutTeacherInputObjectSchema as ClassUncheckedCreateWithoutTeacherInputObjectSchema } from './ClassUncheckedCreateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => ClassCreateWithoutTeacherInputObjectSchema), z.lazy(() => ClassUncheckedCreateWithoutTeacherInputObjectSchema)])
}).strict();
export const ClassCreateOrConnectWithoutTeacherInputObjectSchema: z.ZodType<Prisma.ClassCreateOrConnectWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateOrConnectWithoutTeacherInput>;
export const ClassCreateOrConnectWithoutTeacherInputObjectZodSchema = makeSchema();
