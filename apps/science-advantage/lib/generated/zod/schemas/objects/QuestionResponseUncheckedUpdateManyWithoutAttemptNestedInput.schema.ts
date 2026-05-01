import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateWithoutAttemptInputObjectSchema as QuestionResponseCreateWithoutAttemptInputObjectSchema } from './QuestionResponseCreateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutAttemptInput.schema';
import { QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema as QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema } from './QuestionResponseCreateOrConnectWithoutAttemptInput.schema';
import { QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectSchema as QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectSchema } from './QuestionResponseUpsertWithWhereUniqueWithoutAttemptInput.schema';
import { QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema as QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema } from './QuestionResponseCreateManyAttemptInputEnvelope.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectSchema as QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectSchema } from './QuestionResponseUpdateWithWhereUniqueWithoutAttemptInput.schema';
import { QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectSchema as QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectSchema } from './QuestionResponseUpdateManyWithWhereWithoutAttemptInput.schema';
import { QuestionResponseScalarWhereInputObjectSchema as QuestionResponseScalarWhereInputObjectSchema } from './QuestionResponseScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema).array(), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUpsertWithWhereUniqueWithoutAttemptInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema).optional(),
  set: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUpdateWithWhereUniqueWithoutAttemptInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUpdateManyWithWhereWithoutAttemptInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => QuestionResponseScalarWhereInputObjectSchema), z.lazy(() => QuestionResponseScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInputObjectSchema: z.ZodType<Prisma.QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInput>;
export const QuestionResponseUncheckedUpdateManyWithoutAttemptNestedInputObjectZodSchema = makeSchema();
