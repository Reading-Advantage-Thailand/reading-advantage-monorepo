import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentCreateWithoutTeacherInputObjectSchema as AssignmentCreateWithoutTeacherInputObjectSchema } from './AssignmentCreateWithoutTeacherInput.schema';
import { AssignmentUncheckedCreateWithoutTeacherInputObjectSchema as AssignmentUncheckedCreateWithoutTeacherInputObjectSchema } from './AssignmentUncheckedCreateWithoutTeacherInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AssignmentCreateWithoutTeacherInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutTeacherInputObjectSchema)])
}).strict();
export const AssignmentCreateOrConnectWithoutTeacherInputObjectSchema: z.ZodType<Prisma.AssignmentCreateOrConnectWithoutTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateOrConnectWithoutTeacherInput>;
export const AssignmentCreateOrConnectWithoutTeacherInputObjectZodSchema = makeSchema();
