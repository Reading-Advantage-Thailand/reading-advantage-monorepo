import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassScalarWhereInputObjectSchema as ClassScalarWhereInputObjectSchema } from './ClassScalarWhereInput.schema';
import { ClassUpdateManyMutationInputObjectSchema as ClassUpdateManyMutationInputObjectSchema } from './ClassUpdateManyMutationInput.schema';
import { ClassUncheckedUpdateManyWithoutStudentsInputObjectSchema as ClassUncheckedUpdateManyWithoutStudentsInputObjectSchema } from './ClassUncheckedUpdateManyWithoutStudentsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => ClassScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => ClassUpdateManyMutationInputObjectSchema), z.lazy(() => ClassUncheckedUpdateManyWithoutStudentsInputObjectSchema)])
}).strict();
export const ClassUpdateManyWithWhereWithoutStudentsInputObjectSchema: z.ZodType<Prisma.ClassUpdateManyWithWhereWithoutStudentsInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassUpdateManyWithWhereWithoutStudentsInput>;
export const ClassUpdateManyWithWhereWithoutStudentsInputObjectZodSchema = makeSchema();
