import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentWhereUniqueInputObjectSchema as AssignmentWhereUniqueInputObjectSchema } from './AssignmentWhereUniqueInput.schema';
import { AssignmentUpdateWithoutLessonInputObjectSchema as AssignmentUpdateWithoutLessonInputObjectSchema } from './AssignmentUpdateWithoutLessonInput.schema';
import { AssignmentUncheckedUpdateWithoutLessonInputObjectSchema as AssignmentUncheckedUpdateWithoutLessonInputObjectSchema } from './AssignmentUncheckedUpdateWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateWithoutLessonInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateWithoutLessonInputObjectSchema)])
}).strict();
export const AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateWithWhereUniqueWithoutLessonInput>;
export const AssignmentUpdateWithWhereUniqueWithoutLessonInputObjectZodSchema = makeSchema();
