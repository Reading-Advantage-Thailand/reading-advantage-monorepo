import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string().optional()
}).strict();
export const LessonWhereUniqueInputObjectSchema: z.ZodType<Prisma.LessonWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonWhereUniqueInput>;
export const LessonWhereUniqueInputObjectZodSchema = makeSchema();
