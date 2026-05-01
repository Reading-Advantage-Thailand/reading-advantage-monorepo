import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateWithoutQuestionInputObjectSchema as QuestionResponseCreateWithoutQuestionInputObjectSchema } from './QuestionResponseCreateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutQuestionInput.schema';
import { QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema as QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema } from './QuestionResponseCreateOrConnectWithoutQuestionInput.schema';
import { QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectSchema as QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectSchema } from './QuestionResponseUpsertWithWhereUniqueWithoutQuestionInput.schema';
import { QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema as QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema } from './QuestionResponseCreateManyQuestionInputEnvelope.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectSchema as QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectSchema } from './QuestionResponseUpdateWithWhereUniqueWithoutQuestionInput.schema';
import { QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectSchema as QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectSchema } from './QuestionResponseUpdateManyWithWhereWithoutQuestionInput.schema';
import { QuestionResponseScalarWhereInputObjectSchema as QuestionResponseScalarWhereInputObjectSchema } from './QuestionResponseScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema).array(), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUpdateWithWhereUniqueWithoutQuestionInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUpdateManyWithWhereWithoutQuestionInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => QuestionResponseScalarWhereInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const QuestionResponseUpdateManyWithoutQuestionNestedInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpdateManyWithoutQuestionNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpdateManyWithoutQuestionNestedInput>;
export const QuestionResponseUpdateManyWithoutQuestionNestedInputObjectZodSchema = makeSchema();
