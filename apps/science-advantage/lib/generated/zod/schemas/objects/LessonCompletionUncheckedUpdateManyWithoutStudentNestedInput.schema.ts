import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateWithoutStudentInputObjectSchema as LessonCompletionCreateWithoutStudentInputObjectSchema } from './LessonCompletionCreateWithoutStudentInput.schema';
import { LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema as LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutStudentInput.schema';
import { LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema as LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema } from './LessonCompletionCreateOrConnectWithoutStudentInput.schema';
import { LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectSchema as LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectSchema } from './LessonCompletionUpsertWithWhereUniqueWithoutStudentInput.schema';
import { LessonCompletionCreateManyStudentInputEnvelopeObjectSchema as LessonCompletionCreateManyStudentInputEnvelopeObjectSchema } from './LessonCompletionCreateManyStudentInputEnvelope.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectSchema as LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectSchema } from './LessonCompletionUpdateWithWhereUniqueWithoutStudentInput.schema';
import { LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectSchema as LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectSchema } from './LessonCompletionUpdateManyWithWhereWithoutStudentInput.schema';
import { LessonCompletionScalarWhereInputObjectSchema as LessonCompletionScalarWhereInputObjectSchema } from './LessonCompletionScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionCreateWithoutStudentInputObjectSchema).array(), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutStudentInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionCreateOrConnectWithoutStudentInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUpsertWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => LessonCompletionCreateManyStudentInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUpdateWithWhereUniqueWithoutStudentInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectSchema), z.lazy(() => LessonCompletionUpdateManyWithWhereWithoutStudentInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => LessonCompletionScalarWhereInputObjectSchema), z.lazy(() => LessonCompletionScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const LessonCompletionUncheckedUpdateManyWithoutStudentNestedInputObjectSchema: z.ZodType<Prisma.LessonCompletionUncheckedUpdateManyWithoutStudentNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUncheckedUpdateManyWithoutStudentNestedInput>;
export const LessonCompletionUncheckedUpdateManyWithoutStudentNestedInputObjectZodSchema = makeSchema();
