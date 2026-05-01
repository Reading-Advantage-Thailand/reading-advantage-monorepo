import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunCreateWithoutStudentInputObjectSchema as MasteryRunCreateWithoutStudentInputObjectSchema } from './MasteryRunCreateWithoutStudentInput.schema';
import { MasteryRunUncheckedCreateWithoutStudentInputObjectSchema as MasteryRunUncheckedCreateWithoutStudentInputObjectSchema } from './MasteryRunUncheckedCreateWithoutStudentInput.schema';
import { MasteryRunCreateOrConnectWithoutStudentInputObjectSchema as MasteryRunCreateOrConnectWithoutStudentInputObjectSchema } from './MasteryRunCreateOrConnectWithoutStudentInput.schema';
import { MasteryRunCreateManyStudentInputEnvelopeObjectSchema as MasteryRunCreateManyStudentInputEnvelopeObjectSchema } from './MasteryRunCreateManyStudentInputEnvelope.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './MasteryRunWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => MasteryRunCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => MasteryRunCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => MasteryRunCreateManyStudentInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => MasteryRunWhereUniqueInputObjectSchema), z.lazy(() => MasteryRunWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const MasteryRunUncheckedCreateNestedManyWithoutStudentInputObjectSchema: z.ZodType<Prisma.MasteryRunUncheckedCreateNestedManyWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunUncheckedCreateNestedManyWithoutStudentInput>;
export const MasteryRunUncheckedCreateNestedManyWithoutStudentInputObjectZodSchema = makeSchema();
