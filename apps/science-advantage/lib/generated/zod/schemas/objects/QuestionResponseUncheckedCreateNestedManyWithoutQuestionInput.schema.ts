import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseCreateWithoutQuestionInputObjectSchema as QuestionResponseCreateWithoutQuestionInputObjectSchema } from './QuestionResponseCreateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutQuestionInput.schema';
import { QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema as QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema } from './QuestionResponseCreateOrConnectWithoutQuestionInput.schema';
import { QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema as QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema } from './QuestionResponseCreateManyQuestionInputEnvelope.schema';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema).array(), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => QuestionResponseCreateManyQuestionInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema), z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const QuestionResponseUncheckedCreateNestedManyWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseUncheckedCreateNestedManyWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUncheckedCreateNestedManyWithoutQuestionInput>;
export const QuestionResponseUncheckedCreateNestedManyWithoutQuestionInputObjectZodSchema = makeSchema();
