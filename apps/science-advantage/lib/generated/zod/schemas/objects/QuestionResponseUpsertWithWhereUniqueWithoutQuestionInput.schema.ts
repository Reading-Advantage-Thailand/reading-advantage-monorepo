import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuestionResponseWhereUniqueInputObjectSchema as QuestionResponseWhereUniqueInputObjectSchema } from './QuestionResponseWhereUniqueInput.schema';
import { QuestionResponseUpdateWithoutQuestionInputObjectSchema as QuestionResponseUpdateWithoutQuestionInputObjectSchema } from './QuestionResponseUpdateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedUpdateWithoutQuestionInput.schema';
import { QuestionResponseCreateWithoutQuestionInputObjectSchema as QuestionResponseCreateWithoutQuestionInputObjectSchema } from './QuestionResponseCreateWithoutQuestionInput.schema';
import { QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema as QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema } from './QuestionResponseUncheckedCreateWithoutQuestionInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => QuestionResponseWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => QuestionResponseUpdateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedUpdateWithoutQuestionInputObjectSchema)]),
  create: z.union([z.lazy(() => QuestionResponseCreateWithoutQuestionInputObjectSchema), z.lazy(() => QuestionResponseUncheckedCreateWithoutQuestionInputObjectSchema)])
}).strict();
export const QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectSchema: z.ZodType<Prisma.QuestionResponseUpsertWithWhereUniqueWithoutQuestionInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseUpsertWithWhereUniqueWithoutQuestionInput>;
export const QuestionResponseUpsertWithWhereUniqueWithoutQuestionInputObjectZodSchema = makeSchema();
