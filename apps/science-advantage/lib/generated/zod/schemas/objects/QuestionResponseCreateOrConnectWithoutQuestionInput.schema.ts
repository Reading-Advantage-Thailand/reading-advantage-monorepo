import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseCreateWithoutQuestionInputObjectSchema as QuestionResponseCreateWithoutQuestionInputObjectSchema } from './QuestionResponseCreateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutQuestionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema)])
}).strict();
export const QuestionResponseCreateOrConnectWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseCreateOrConnectWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseCreateOrConnectWithoutQuestionInput>;
export const QuestionResponseCreateOrConnectWithoutQuestionInputObjectZodSchema = makeSchema();
