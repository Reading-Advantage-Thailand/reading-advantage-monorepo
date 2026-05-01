import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryScalarWhereInputObjectSchema as StandardMasteryScalarWhereInputObjectSchema } from './StandardMasteryScalarWhereInput.schema';
import { StandardMasteryUpdateManyMutationInputObjectSchema as StandardMasteryUpdateManyMutationInputObjectSchema } from './StandardMasteryUpdateManyMutationInput.schema';
import { StandardMasteryUncheckedUpdateManyWithoutStudentInputObjectSchema as StandardMasteryUncheckedUpdateManyWithoutStudentInputObjectSchema } from './StandardMasteryUncheckedUpdateManyWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardMasteryScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => StandardMasteryUpdateManyMutationInputObjectSchema), z.lazy(() => StandardMasteryUncheckedUpdateManyWithoutStudentInputObjectSchema)])
}).strict();
export const StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryUpdateManyWithWhereWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryUpdateManyWithWhereWithoutStudentInput>;
export const StandardMasteryUpdateManyWithWhereWithoutStudentInputObjectZodSchema = makeSchema();
