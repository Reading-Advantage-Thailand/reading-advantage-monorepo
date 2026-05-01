import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardWhereUniqueInputObjectSchema as StandardWhereUniqueInputObjectSchema } from './StandardWhereUniqueInput.schema';
import { StandardUpdateWithoutLessonsInputObjectSchema as StandardUpdateWithoutLessonsInputObjectSchema } from './StandardUpdateWithoutLessonsInput.schema';
import { StandardUncheckedUpdateWithoutLessonsInputObjectSchema as StandardUncheckedUpdateWithoutLessonsInputObjectSchema } from './StandardUncheckedUpdateWithoutLessonsInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => StandardWhereUniqueInputObjectSchema),
  data: z.union([z.lazy(() => StandardUpdateWithoutLessonsInputObjectSchema), z.lazy(() => StandardUncheckedUpdateWithoutLessonsInputObjectSchema)])
}).strict();
export const StandardUpdateWithWhereUniqueWithoutLessonsInputObjectSchema: z.ZodType<Prisma.StandardUpdateWithWhereUniqueWithoutLessonsInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardUpdateWithWhereUniqueWithoutLessonsInput>;
export const StandardUpdateWithWhereUniqueWithoutLessonsInputObjectZodSchema = makeSchema();
