import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardCreateWithoutQuizQuestionsInputObjectSchema as StandardCreateWithoutQuizQuestionsInputObjectSchema } from './StandardCreateWithoutQuizQuestionsInput.schema';
import { StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema as StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema } from './StandardUncheckedCreateWithoutQuizQuestionsInput.schema';
import { StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema as StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema } from './StandardCreateOrConnectWithoutQuizQuestionsInput.schema';
import { StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectSchema as StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectSchema } from './StandardUpsertWithWhereUniqueWithoutQuizQuestionsInput.schema';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectSchema as StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectSchema } from './StandardUpdateWithWhereUniqueWithoutQuizQuestionsInput.schema';
import { StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectSchema as StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectSchema } from './StandardUpdateManyWithWhereWithoutQuizQuestionsInput.schema';
import { StandardScalarWhereInputObjectSchema as StandardScalarWhereInputObjectSchema } from './StandardScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardCreateWithoutQuizQuestionsInputObjectSchema).array(), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUncheckedCreateWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardCreateOrConnectWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUpsertWithWhereUniqueWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => StandardWhereUniqueInputObjectSchema), z.lazy(() => StandardWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUpdateWithWhereUniqueWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectSchema), z.lazy(() => StandardUpdateManyWithWhereWithoutQuizQuestionsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => StandardScalarWhereInputObjectSchema), z.lazy(() => StandardScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInputObjectSchema: z.ZodType<Prisma.StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInput>;
export const StandardUncheckedUpdateManyWithoutQuizQuestionsNestedInputObjectZodSchema = makeSchema();
