import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutQuizQuestionsInputObjectSchema as StandardCreateWithoutQuizQuestionsInputObjectSchema } from './StandardCreateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedCreateWithoutQuizQuestionsInput.schema';
import { StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema as StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema } from './StandardCreateOrConnectWithoutQuizQuestionsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema).array(), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const StandardUncheckedCreateNestedManyWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardUncheckedCreateNestedManyWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedCreateNestedManyWithoutQuizQuestionsInput>;
export const StandardUncheckedCreateNestedManyWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
