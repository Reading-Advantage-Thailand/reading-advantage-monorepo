import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutLessonInputObjectSchema as AssignmentUpdateWithoutLessonInputObjectSchema } from './AssignmentUpdateWithoutLessonInput.schema';
import { AssignmentUncheckedUpdateWithoutLessonInputObjectSchema as AssignmentUncheckedUpdateWithoutLessonInputObjectSchema } from './AssignmentUncheckedUpdateWithoutLessonInput.schema';
import { AssignmentCreateWithoutLessonInputObjectSchema as AssignmentCreateWithoutLessonInputObjectSchema } from './AssignmentCreateWithoutLessonInput.schema';
import { AssignmentUncheckedCreateWithoutLessonInputObjectSchema as AssignmentUncheckedCreateWithoutLessonInputObjectSchema } from './AssignmentUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AssignmentUpdateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutLessonInputObjectSchema)]),
  create: z.union([z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutLessonInput>;
export const AssignmentUpsertWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
