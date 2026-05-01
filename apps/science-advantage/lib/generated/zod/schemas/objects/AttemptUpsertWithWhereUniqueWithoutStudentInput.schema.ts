import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithoutStudentInputObjectSchema as AttemptUpdateWithoutStudentInputObjectSchema } from './AttemptUpdateWithoutStudentInput.schema';
import { AttemptUncheckedUpdateWithoutStudentInputObjectSchema as AttemptUncheckedUpdateWithoutStudentInputObjectSchema } from './AttemptUncheckedUpdateWithoutStudentInput.schema';
import { AttemptCreateWithoutStudentInputObjectSchema as AttemptCreateWithoutStudentInputObjectSchema } from './AttemptCreateWithoutStudentInput.schema';
import { AttemptUncheckedCreateWithoutStudentInputObjectSchema as AttemptUncheckedCreateWithoutStudentInputObjectSchema } from './AttemptUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AttemptUpdateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutStudentInputObjectSchema)]),
  create: z.union([z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const AttemptUpsertWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptUpsertWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpsertWithWhereUniqueWithoutStudentInput>;
export const AttemptUpsertWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
