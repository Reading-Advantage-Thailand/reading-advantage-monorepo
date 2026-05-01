import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunUpdateWithoutStudentInputObjectSchema as MasteryRunUpdateWithoutStudentInputObjectSchema } from './MasteryRunUpdateWithoutStudentInput.schema';
import { MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema as MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedUpdateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => MasteryRunUpdateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedUpdateWithoutStudentInputObjectSchema)])
}).strict();
export const MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUpdateWithWhereUniqueWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUpdateWithWhereUniqueWithoutStudentInput>;
export const MasteryRunUpdateWithWhereUniqueWithoutStudentInputObjectZodSchema = makeSchema();
