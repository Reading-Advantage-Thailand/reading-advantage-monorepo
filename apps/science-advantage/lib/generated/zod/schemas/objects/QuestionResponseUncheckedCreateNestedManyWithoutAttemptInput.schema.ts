import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateWithoutAttemptInputObjectSchema as QuestionResponseCreateWithoutAttemptInputObjectSchema } from './QuestionResponseCreateWithoutAttemptInput.schema';
import { QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema as QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutAttemptInput.schema';
import { QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema as QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema } from './QuestionResponseCreateOrConnectWithoutAttemptInput.schema';
import { QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema as QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema } from './QuestionResponseCreateManyAttemptInputEnvelope.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseCreateWithoutAttemptInputObjectSchema).array(), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutAttemptInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema), z.lazy(() => QuestionResponseCreateOrConnectWithoutAttemptInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuestionResponseCreateManyAttemptInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectSchema: z.ZodType<Prisma.QuestionResponseUncheckedCreateNestedManyWithoutAttemptInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUncheckedCreateNestedManyWithoutAttemptInput>;
export const QuestionResponseUncheckedCreateNestedManyWithoutAttemptInputObjectZodSchema = makeSchema();
