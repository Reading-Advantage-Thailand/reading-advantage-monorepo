import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutLessonInputObjectSchema as QuizQuestionCreateWithoutLessonInputObjectSchema } from './QuizQuestionCreateWithoutLessonInput.schema';
import { QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema as QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutLessonInput.schema';
import { QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema as QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutLessonInput.schema';
import { QuizQuestionCreateManyLessonInputEnvelopeObjectSchema as QuizQuestionCreateManyLessonInputEnvelopeObjectSchema } from './QuizQuestionCreateManyLessonInputEnvelope.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => QuizQuestionCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuizQuestionCreateManyLessonInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const QuizQuestionUncheckedCreateNestedManyWithoutLessonInputObjectSchema: z.ZodType<Prisma.QuizQuestionUncheckedCreateNestedManyWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUncheckedCreateNestedManyWithoutLessonInput>;
export const QuizQuestionUncheckedCreateNestedManyWithoutLessonInputObjectZodSchema = makeSchema();
