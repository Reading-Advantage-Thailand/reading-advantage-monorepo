import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutLessonInputObjectSchema as AttemptCreateWithoutLessonInputObjectSchema } from './AttemptCreateWithoutLessonInput.schema';
import { AttemptUncheckedCreateWithoutLessonInputObjectSchema as AttemptUncheckedCreateWithoutLessonInputObjectSchema } from './AttemptUncheckedCreateWithoutLessonInput.schema';
import { AttemptCreateOrConnectWithoutLessonInputObjectSchema as AttemptCreateOrConnectWithoutLessonInputObjectSchema } from './AttemptCreateOrConnectWithoutLessonInput.schema';
import { AttemptUpsertWithWhereUniqueWithoutLessonInputObjectSchema as AttemptUpsertWithWhereUniqueWithoutLessonInputObjectSchema } from './AttemptUpsertWithWhereUniqueWithoutLessonInput.schema';
import { AttemptCreateManyLessonInputEnvelopeObjectSchema as AttemptCreateManyLessonInputEnvelopeObjectSchema } from './AttemptCreateManyLessonInputEnvelope.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema';
import { AttemptUpdateWithWhereUniqueWithoutLessonInputObjectSchema as AttemptUpdateWithWhereUniqueWithoutLessonInputObjectSchema } from './AttemptUpdateWithWhereUniqueWithoutLessonInput.schema';
import { AttemptUpdateManyWithWhereWithoutLessonInputObjectSchema as AttemptUpdateManyWithWhereWithoutLessonInputObjectSchema } from './AttemptUpdateManyWithWhereWithoutLessonInput.schema';
import { AttemptScalarWhereInputObjectSchema as AttemptScalarWhereInputObjectSchema } from './AttemptScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AttemptCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => AttemptCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => AttemptUpsertWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => AttemptUpsertWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AttemptCreateManyLessonInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => AttemptUpdateWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => AttemptUpdateWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => AttemptUpdateManyWithWhereWithoutLessonInputObjectSchema), z.lazy(() => AttemptUpdateManyWithWhereWithoutLessonInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => AttemptScalarWhereInputObjectSchema), z.lazy(() => AttemptScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const AttemptUpdateManyWithoutLessonNestedInputObjectSchema: z.ZodType<Prisma.AttemptUpdateManyWithoutLessonNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateManyWithoutLessonNestedInput>;
export const AttemptUpdateManyWithoutLessonNestedInputObjectZodSchema = makeSchema();
