import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentCreateWithoutLessonInputObjectSchema as AssignmentCreateWithoutLessonInputObjectSchema } from './AssignmentCreateWithoutLessonInput.schema';
import { AssignmentUncheckedCreateWithoutLessonInputObjectSchema as AssignmentUncheckedCreateWithoutLessonInputObjectSchema } from './AssignmentUncheckedCreateWithoutLessonInput.schema';
import { AssignmentCreateOrConnectWithoutLessonInputObjectSchema as AssignmentCreateOrConnectWithoutLessonInputObjectSchema } from './AssignmentCreateOrConnectWithoutLessonInput.schema';
import { AssignmentCreateManyLessonInputEnvelopeObjectSchema as AssignmentCreateManyLessonInputEnvelopeObjectSchema } from './AssignmentCreateManyLessonInputEnvelope.schema';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema).array(), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema).array()]).optional(),
  connectOrCreate: z.union([z.lazy(() => AssignmentCreateOrConnectWithoutLessonInputObjectSchema), z.lazy(() => AssignmentCreateOrConnectWithoutLessonInputObjectSchema).array()]).optional(),
  createMany: z.lazy(() => AssignmentCreateManyLessonInputEnvelopeObjectSchema).optional(),
  connect: z.union([z.lazy(() => AssignmentWhereUniqueInputObjectSchema), z.lazy(() => AssignmentWhereUniqueInputObjectSchema).array()]).optional()
}).strict();
export const AssignmentCreateNestedManyWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentCreateNestedManyWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateNestedManyWithoutLessonInput>;
export const AssignmentCreateNestedManyWithoutLessonInputObjectZodSchema = makeSchema();
