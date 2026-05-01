import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptScalarWhereInputObjectSchema as AttemptScalarWhereInputObjectSchema } from './AttemptScalarWhereInput.schema';
import { AttemptUpdateManyMutationInputObjectSchema as AttemptUpdateManyMutationInputObjectSchema } from './AttemptUpdateManyMutationInput.schema';
import { AttemptUncheckedUpdateManyWithoutLessonInputObjectSchema as AttemptUncheckedUpdateManyWithoutLessonInputObjectSchema } from './AttemptUncheckedUpdateManyWithoutLessonInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => AttemptUpdateManyMutationInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateManyWithoutLessonInputObjectSchema)])
}).strict();
export const AttemptUpdateManyWithWhereWithoutLessonInputObjectSchema: z.ZodType<Prisma.AttemptUpdateManyWithWhereWithoutLessonInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateManyWithWhereWithoutLessonInput>;
export const AttemptUpdateManyWithWhereWithoutLessonInputObjectZodSchema = makeSchema();
