import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunScalarWhereInputObjectSchema as MasteryRunScalarWhereInputObjectSchema } from './MasteryRunScalarWhereInput.schema';
import { MasteryRunUpdateManyMutationInputObjectSchema as MasteryRunUpdateManyMutationInputObjectSchema } from './MasteryRunUpdateManyMutationInput.schema';
import { MasteryRunUncheckedUpdateManyWithoutStudentInputObjectSchema as MasteryRunUncheckedUpdateManyWithoutStudentInputObjectSchema } from './MasteryRunUncheckedUpdateManyWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => MasteryRunUpdateManyMutationInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateManyWithoutStudentInputObjectSchema)])
}).strict();
export const MasteryRunUpdateManyWithWhereWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateManyWithWhereWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateManyWithWhereWithoutStudentInput>;
export const MasteryRunUpdateManyWithWhereWithoutStudentInputObjectZodSchema = makeSchema();
