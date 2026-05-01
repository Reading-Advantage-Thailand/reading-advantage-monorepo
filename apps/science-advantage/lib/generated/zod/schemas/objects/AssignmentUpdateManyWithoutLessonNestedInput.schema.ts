import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutLessonInputObjectSchema as AssignmentCreateWithoutLessonInputObjectSchema } from './AssignmentCreateWithoutLessonInput.schema';
import { AssignmentUncheckedCreateWithoutLessonInputObjectSchema as AssignmentUncheckedCreateWithoutLessonInputObjectSchema } from './AssignmentUncheckedCreateWithoutLessonInput.schema';
import { AssignmentCreateOrConnectWithoutLessonInputObjectSchema as AssignmentCreateOrConnectWithoutLessonInputObjectSchema } from './AssignmentCreateOrConnectWithoutLessonInput.schema';
import { AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectSchema as AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectSchema } from './AssignmentUpsertWithWhereUniqueWithoutLessonInput.schema';
import { AssignmentCreateManyLessonInputEnvelopeObjectSchema as AssignmentCreateManyLessonInputEnvelopeObjectSchema } from './AssignmentCreateManyLessonInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectSchema as AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectSchema } from './AssignmentUpdateWithWhereUniqueWithoutLessonInput.schema';
import { AssignmentUpdateManyWithWhereWithoutLessonInputObjectSchema as AssignmentUpdateManyWithWhereWithoutLessonInputObjectSchema } from './AssignmentUpdateManyWithWhereWithoutLessonInput.schema';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyLessonInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AssignmentUpdateManyWithWhereWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUpdateManyWithWhereWithoutLessonInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AssignmentScalarWhereInputObjectSchema), z.lazy(() => AssignmentScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentUpdateManyWithoutLessonNestedInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateManyWithoutLessonNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateManyWithoutLessonNestedInput>;
export const AssignmentUpdateManyWithoutLessonNestedInputObjectZodSchema = makeSchema();
