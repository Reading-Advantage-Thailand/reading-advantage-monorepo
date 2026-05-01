import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassScalarWhereInputObjectSchema as ClassScalarWhereInputObjectSchema } from './ClassScalarWhereInput.schema';
import { ClassUpdateManyMutationInputObjectSchema as ClassUpdateManyMutationInputObjectSchema } from './ClassUpdateManyMutationInput.schema';
import { ClassUncheckedUpdateManyWithoutTeacherInputObjectSchema as ClassUncheckedUpdateManyWithoutTeacherInputObjectSchema } from './ClassUncheckedUpdateManyWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => ClassUpdateManyMutationInputObjectSchema), z.lazy(() => ClassUncheckedUpdateManyWithoutTeacherInputObjectSchema)])
}).strict();
export const ClassUpdateManyWithWhereWithoutTeacherInputObjectSchema: z.ZodType<Prisma.ClassUpdateManyWithWhereWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateManyWithWhereWithoutTeacherInput>;
export const ClassUpdateManyWithWhereWithoutTeacherInputObjectZodSchema = makeSchema();
