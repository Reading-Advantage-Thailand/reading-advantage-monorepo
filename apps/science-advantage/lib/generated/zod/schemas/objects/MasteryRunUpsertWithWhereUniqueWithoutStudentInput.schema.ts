import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunUpdateWithoutStudentInputObjectSchema as MasteryRunUpdateWithoutStudentInputObjectSchema } from './MasteryRunUpdateWithoutStudentInput.schema';
import { MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema as MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedUpdateWithoutStudentInput.schema';
import { MasteryRunCreateWithoutStudentInputObjectSchema as MasteryRunCreateWithoutStudentInputObjectSchema } from './MasteryRunCreateWithoutStudentInput.schema';
import { MasteryRunUncheckedCreateWithoutStudentInputObjectSchema as MasteryRunUncheckedCreateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => MasteryRunUpdateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema)]),
  create: z.union([z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUpsertWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpsertWithWhereUniqueWithoutStudentInput>;
export const MasteryRunUpsertWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
