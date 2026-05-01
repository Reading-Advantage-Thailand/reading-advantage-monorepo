import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutLessonInputObjectSchema as QuizQuestionCreateWithoutLessonInputObjectSchema } from './QuizQuestionCreateWithoutLessonInput.schema';
import { QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema as QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutLessonInput.schema';
import { QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema as QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutLessonInput.schema';
import { QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectSchema as QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectSchema } from './QuizQuestionUpsertWithWhereUniqueWithoutLessonInput.schema';
import { QuizQuestionCreateManyLessonInputEnvelopeObjectSchema as QuizQuestionCreateManyLessonInputEnvelopeObjectSchema } from './QuizQuestionCreateManyLessonInputEnvelope.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectSchema as QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectSchema } from './QuizQuestionUpdateWithWhereUniqueWithoutLessonInput.schema';
import { QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectSchema as QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectSchema } from './QuizQuestionUpdateManyWithWhereWithoutLessonInput.schema';
import { QuizQuestionScalarWhereInputObjectSchema as QuizQuestionScalarWhereInputObjectSchema } from './QuizQuestionScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUpsertWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuizQuestionCreateManyLessonInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUpdateWithWhereUniqueWithoutLessonInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUpdateManyWithWhereWithoutLessonInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => QuizQuestionScalarWhereInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const QuizQuestionUncheckedUpdateManyWithoutLessonNestedInputObjectSchema: z.ZodType<Prisma.QuizQuestionUncheckedUpdateManyWithoutLessonNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUncheckedUpdateManyWithoutLessonNestedInput>;
export const QuizQuestionUncheckedUpdateManyWithoutLessonNestedInputObjectZodSchema = makeSchema();
