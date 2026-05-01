import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentCreateWithoutLessonInputObjectSchema as AssignmentCreateWithoutLessonInputObjectSchema } from './AssignmentCreateWithoutLessonInput.schema';
import { AssignmentUncheckedCreateWithoutLessonInputObjectSchema as AssignmentUncheckedCreateWithoutLessonInputObjectSchema } from './AssignmentUncheckedCreateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => AssignmentCreateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedCreateWithoutLessonInputObjectSchema)])
}).strict();
export const AssignmentCreateOrConnectWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentCreateOrConnectWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentCreateOrConnectWithoutLessonInput>;
export const AssignmentCreateOrConnectWithoutLessonInputObjectZodSchema = makeSchema();
