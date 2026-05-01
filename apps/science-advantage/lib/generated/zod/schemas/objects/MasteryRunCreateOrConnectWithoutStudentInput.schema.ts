import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema';
import { MasteryRunCreateWithoutStudentInputObjectSchema as MasteryRunCreateWithoutStudentInputObjectSchema } from './MasteryRunCreateWithoutStudentInput.schema';
import { MasteryRunUncheckedCreateWithoutStudentInputObjectSchema as MasteryRunUncheckedCreateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedCreateWithoutStudentInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => MasteryRunWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema)])
}).strict();
export const MasteryRunCreateOrConnectWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunCreateOrConnectWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunCreateOrConnectWithoutStudentInput>;
export const MasteryRunCreateOrConnectWithoutStudentInputObjectZodSchema = makeSchema();
