import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptScalarWhereInputObjectSchema as AttemptScalarWhereInputObjectSchema } from './AttemptScalarWhereInput.schema';
import { AttemptUpdateManyMutationInputObjectSchema as AttemptUpdateManyMutationInputObjectSchema } from './AttemptUpdateManyMutationInput.schema';
import { AttemptUncheckedUpdateManyWithoutStudentInputObjectSchema as AttemptUncheckedUpdateManyWithoutStudentInputObjectSchema } from './AttemptUncheckedUpdateManyWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AttemptUpdateManyMutationInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateManyWithoutStudentInputObjectSchema)])
}).strict();
export const AttemptUpdateManyWithWhereWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptUpdateManyWithWhereWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateManyWithWhereWithoutStudentInput>;
export const AttemptUpdateManyWithWhereWithoutStudentInputObjectZodSchema = makeSchema();
