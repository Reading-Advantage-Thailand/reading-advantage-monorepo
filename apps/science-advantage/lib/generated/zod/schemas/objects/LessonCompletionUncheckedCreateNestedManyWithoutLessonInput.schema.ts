import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionCreateWithoutLessonInputObjectSchema as LessonCompletionCreateWithoutLessonInputObjectSchema } from './LessonCompletionCreateWithoutLessonInput.schema';
import { LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema as LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema } from './LessonCompletionUncheckedCreateWithoutLessonInput.schema';
import { LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema as LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema } from './LessonCompletionCreateOrConnectWithoutLessonInput.schema';
import { LessonCompletionCreateManyLessonInputEnvelopeObjectSchema as LessonCompletionCreateManyLessonInputEnvelopeObjectSchema } from './LessonCompletionCreateManyLessonInputEnvelope.schema';
import { LessonCompletionWhereUniqueInputObjectSchema as LessonCompletionWhereUniqueInputObjectSchema } from './LessonCompletionWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => LessonCompletionCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => LessonCompletionCreateManyLessonInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema), z.lazy(() => LessonCompletionWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const LessonCompletionUncheckedCreateNestedManyWithoutLessonInputObjectSchema: z.ZodType<Prisma.LessonCompletionUncheckedCreateNestedManyWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionUncheckedCreateNestedManyWithoutLessonInput>;
export const LessonCompletionUncheckedCreateNestedManyWithoutLessonInputObjectZodSchema = makeSchema();
