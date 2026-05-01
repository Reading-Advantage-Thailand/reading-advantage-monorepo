import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateWithoutLessonInputObjectSchema as AttemptCreateWithoutLessonInputObjectSchema } from './AttemptCreateWithoutLessonInput.schema';
import { AttemptUncheckedCreateWithoutLessonInputObjectSchema as AttemptUncheckedCreateWithoutLessonInputObjectSchema } from './AttemptUncheckedCreateWithoutLessonInput.schema';
import { AttemptCreateOrConnectWithoutLessonInputObjectSchema as AttemptCreateOrConnectWithoutLessonInputObjectSchema } from './AttemptCreateOrConnectWithoutLessonInput.schema';
import { AttemptCreateManyLessonInputEnvelopeObjectSchema as AttemptCreateManyLessonInputEnvelopeObjectSchema } from './AttemptCreateManyLessonInputEnvelope.schema';
import { AttemptWhereUniqueInputObjectSchema as AttemptWhereUniqueInputObjectSchema } from './AttemptWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => AttemptUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AttemptCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => AttemptCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AttemptCreateManyLessonInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AttemptWhereUniqueInputObjectSchema), z.lazy(() => AttemptWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AttemptCreateNestedManyWithoutLessonInputObjectSchema: z.ZodType<Prisma.AttemptCreateNestedManyWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateNestedManyWithoutLessonInput>;
export const AttemptCreateNestedManyWithoutLessonInputObjectZodSchema = makeSchema();
