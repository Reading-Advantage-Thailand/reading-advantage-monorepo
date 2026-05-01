import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { QuizQuestionCreateWithoutStandardsInputObjectSchema as QuizQuestionCreateWithoutStandardsInputObjectSchema } from './QuizQuestionCreateWithoutStandardsInput.schema';
import { QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema as QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema } from './QuizQuestionUncheckedCreateWithoutStandardsInput.schema';
import { QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema as QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema } from './QuizQuestionCreateOrConnectWithoutStandardsInput.schema';
import { QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectSchema as QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectSchema } from './QuizQuestionUpsertWithWhereUniqueWithoutStandardsInput.schema';
import { QuizQuestionWhereUniqueInputObjectSchema as QuizQuestionWhereUniqueInputObjectSchema } from './QuizQuestionWhereUniqueInput.schema';
import { QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectSchema as QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectSchema } from './QuizQuestionUpdateWithWhereUniqueWithoutStandardsInput.schema';
import { QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectSchema as QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectSchema } from './QuizQuestionUpdateManyWithWhereWithoutStandardsInput.schema';
import { QuizQuestionScalarWhereInputObjectSchema as QuizQuestionScalarWhereInputObjectSchema } from './QuizQuestionScalarWhereInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionCreateWithoutStandardsInputObjectSchema).array(), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUncheckedCreateWithoutStandardsInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionCreateOrConnectWithoutStandardsInputObjectSchema).array()]).optional(),
  upsert: z.union([z.lazy(() => QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUpsertWithWhereUniqueWithoutStandardsInputObjectSchema).array()]).optional(),
  set: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  disconnect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  delete: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  connect: z.union([z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema), z.lazy(() => QuizQuestionWhereUniqueInputObjectSchema).array()]).optional(),
  update: z.union([z.lazy(() => QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUpdateWithWhereUniqueWithoutStandardsInputObjectSchema).array()]).optional(),
  updateMany: z.union([z.lazy(() => QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectSchema), z.lazy(() => QuizQuestionUpdateManyWithWhereWithoutStandardsInputObjectSchema).array()]).optional(),
  deleteMany: z.union([z.lazy(() => QuizQuestionScalarWhereInputObjectSchema), z.lazy(() => QuizQuestionScalarWhereInputObjectSchema).array()]).optional()
}).strict();
export const QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInputObjectSchema: z.ZodType<Prisma.QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInput>;
export const QuizQuestionUncheckedUpdateManyWithoutStandardsNestedInputObjectZodSchema = makeSchema();
