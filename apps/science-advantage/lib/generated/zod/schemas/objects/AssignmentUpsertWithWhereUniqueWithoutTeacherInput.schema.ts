import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutTeacherInputObjectSchema as AssignmentUpdateWithoutTeacherInputObjectSchema } from './AssignmentUpdateWithoutTeacherInput.schema';
import { AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema as AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedUpdateWithoutTeacherInput.schema';
import { AssignmentCreateWithoutTeacherInputObjectSchema as AssignmentCreateWithoutTeacherInputObjectSchema } from './AssignmentCreateWithoutTeacherInput.schema';
import { AssignmentUncheckedCreateWithoutTeacherInputObjectSchema as AssignmentUncheckedCreateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedCreateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  update: z.union([z.lazy(() => AssignmentUpdateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema)]),
  create: z.union([z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema)])
}).strict();
export const AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpsertWithWhereUniqueWithoutTeacherInput>;
export const AssignmentUpsertWithWhereUniqueWithoutTeacherInputObjectZodSchema = makeSchema();
