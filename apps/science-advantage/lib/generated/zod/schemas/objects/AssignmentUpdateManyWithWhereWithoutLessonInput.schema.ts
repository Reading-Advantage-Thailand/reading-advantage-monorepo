import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentScalarWhereInputObjectSchema as AssignmentScalarWhereInputObjectSchema } from './AssignmentScalarWhereInput.schema';
import { AssignmentUpdateManyMutationInputObjectSchema as AssignmentUpdateManyMutationInputObjectSchema } from './AssignmentUpdateManyMutationInput.schema';
import { AssignmentUncheckedUpdateManyWithoutLessonInputObjectSchema as AssignmentUncheckedUpdateManyWithoutLessonInputObjectSchema } from './AssignmentUncheckedUpdateManyWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AssignmentScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AssignmentUpdateManyMutationInputObjectSchema), z.lazy(() => AssignmentUncheckedUpdateManyWithoutLessonInputObjectSchema)])
}).strict();
export const AssignmentUpdateManyWithWhereWithoutLessonInputObjectSchema: z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentUpdateManyWithWhereWithoutLessonInput>;
export const AssignmentUpdateManyWithWhereWithoutLessonInputObjectZodSchema = makeSchema();
