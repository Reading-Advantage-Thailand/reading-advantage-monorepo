import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutTeacherInputObjectSchema as AssignmentUpdateWithoutTeacherInputObjectSchema } from './AssignmentUpdateWithoutTeacherInput.schema';
import { AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema as AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedUpdateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutTeacherInputObjectSchema)])
}).strict();
export const AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutTeacherInput>;
export const AssignmentUpdateWithWhereUniqueWithoutTeacherInputObjectZodSchema = makeSchema();
