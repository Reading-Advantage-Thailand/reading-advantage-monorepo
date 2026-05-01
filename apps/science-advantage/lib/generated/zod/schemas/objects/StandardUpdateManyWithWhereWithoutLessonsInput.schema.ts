import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardScalarWhereInputObjectSchema as StandardScalarWhereInputObjectSchema } from './StandardScalarWhereInput.schema';
import { StandardUpdateManyMutationInputObjectSchema as StandardUpdateManyMutationInputObjectSchema } from './StandardUpdateManyMutationInput.schema';
import { StandardUncheckedUpdateManyWithoutLessonsInputObjectSchema as StandardUncheckedUpdateManyWithoutLessonsInputObjectSchema } from './StandardUncheckedUpdateManyWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardScalarWhereInputObjectSchema),
  data: z.union([z.lazy(() => StandardUpdateManyMutationInputObjectSchema), z.lazy(() => StandardUncheckedUpdateManyWithoutLessonsInputObjectSchema)])
}).strict();
export const StandardUpdateManyWithWhereWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUpdateManyWithWhereWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateManyWithWhereWithoutLessonsInput>;
export const StandardUpdateManyWithWhereWithoutLessonsInputObjectZodSchema = makeSchema();
