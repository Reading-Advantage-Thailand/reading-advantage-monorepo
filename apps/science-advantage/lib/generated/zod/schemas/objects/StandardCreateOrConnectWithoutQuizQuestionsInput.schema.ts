import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardCreateWithoutQuizQuestionsInputObjectSchema as StandardCreateWithoutQuizQuestionsInputObjectSchema } from './StandardCreateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedCreateWithoutQuizQuestionsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema)])
}).strict();
export const StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema: z.ZodType<Prisma.StandardCreateOrConnectWithoutQuizQuestionsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateOrConnectWithoutQuizQuestionsInput>;
export const StandardCreateOrConnectWithoutQuizQuestionsInputObjectZodSchema = makeSchema();
