import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateWithoutStudentInputObjectSchema as LessonCompletionCreateWithoutStudentInputObjectSchema } from './LessonCompletionCreateWithoutStudentInput.schema';
import { LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema as LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutStudentInput.schema';
import { LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema as LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema } from './LessonCompletionCreateOrConnectWithoutStudentInput.schema';
import { LessonCompletionCreateManyStudentInputEnvelopeObjectSchema as LessonCompletionCreateManyStudentInputEnvelopeObjectSchema } from './LessonCompletionCreateManyStudentInputEnvelope.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => LessonCompletionCreateManyStudentInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectSchema: z.ZodType<Prisma.LessonCompletionUncheckedCreateNestedManyWithoutStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUncheckedCreateNestedManyWithoutStudentInput>;
export const LessonCompletionUncheckedCreateNestedManyWithoutStudentInputObjectZodSchema = makeSchema();
