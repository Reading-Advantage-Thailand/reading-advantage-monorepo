import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithoutStudentInputObjectSchema as AttemptUpdateWithoutStudentInputObjectSchema } from './AttemptUpdateWithoutStudentInput.schema';
import { AttemptUncheckedUpdateWithoutStudentInputObjectSchema as AttemptUncheckedUpdateWithoutStudentInputObjectSchema } from './AttemptUncheckedUpdateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AttemptUpdateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutStudentInputObjectSchema)])
}).strict();
export const AttemptUpdateWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptUpdateWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateWithWhereUniqueWithoutStudentInput>;
export const AttemptUpdateWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
