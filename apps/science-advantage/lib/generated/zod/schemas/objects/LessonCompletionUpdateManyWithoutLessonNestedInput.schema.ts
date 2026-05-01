import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateWithoutLessonInputObjectSchema as LessonCompletionCreateWithoutLessonInputObjectSchema } from './LessonCompletionCreateWithoutLessonInput.schema';
import { LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema as LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutLessonInput.schema';
import { LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema as LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema } from './LessonCompletionCreateOrConnectWithoutLessonInput.schema';
import { LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectSchema as LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectSchema } from './LessonCompletionUpsertWithWhereUniqueWithoutLessonInput.schema';
import { LessonCompletionCreateManyLessonInputEnvelopeObjectSchema as LessonCompletionCreateManyLessonInputEnvelopeObjectSchema } from './LessonCompletionCreateManyLessonInputEnvelope.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema';
import { LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectSchema as LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectSchema } from './LessonCompletionUpdateWithWhereUniqueWithoutLessonInput.schema';
import { LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectSchema as LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectSchema } from './LessonCompletionUpdateManyWithWhereWithoutLessonInput.schema';
import { LessonCompletionScalarWhereInputObjectSchema as LessonCompletionScalarWhereInputObjectSchema } from './LessonCompletionScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUpsertWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => LessonCompletionCreateManyLessonInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUpdateWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUpdateManyWithWhereWithoutLessonInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => LessonCompletionScalarWhereInputObjectSchema), z.lazy(() => LessonCompletionScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const LessonCompletionUpdateManyWithoutLessonNestedInputObjectSchema: z.ZodType<Prisma.LessonCompletionUpdateManyWithoutLessonNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUpdateManyWithoutLessonNestedInput>;
export const LessonCompletionUpdateManyWithoutLessonNestedInputObjectZodSchema = makeSchema();
