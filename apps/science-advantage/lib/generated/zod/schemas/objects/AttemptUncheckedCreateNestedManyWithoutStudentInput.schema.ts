import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutStudentInputObjectSchema as AttemptCreateWithoutStudentInputObjectSchema } from './AttemptCreateWithoutStudentInput.schema';
import { AttemptUncheckedCreateWithoutStudentInputObjectSchema as AttemptUncheckedCreateWithoutStudentInputObjectSchema } from './AttemptUncheckedCreateWithoutStudentInput.schema';
import { AttemptCreateOrConnectWithoutStudentInputObjectSchema as AttemptCreateOrConnectWithoutStudentInputObjectSchema } from './AttemptCreateOrConnectWithoutStudentInput.schema';
import { AttemptCreateManyStudentInputEnvelopeObjectSchema as AttemptCreateManyStudentInputEnvelopeObjectSchema } from './AttemptCreateManyStudentInputEnvelope.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AttemptCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => AttemptCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AttemptCreateManyStudentInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AttemptUncheckedCreateNestedManyWithoutStudentInputObjectSchema: z.ZodType<Prisma.AttemptUncheckedCreateNestedManyWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUncheckedCreateNestedManyWithoutStudentInput>;
export const AttemptUncheckedCreateNestedManyWithoutStudentInputObjectZodSchema = makeSchema();
