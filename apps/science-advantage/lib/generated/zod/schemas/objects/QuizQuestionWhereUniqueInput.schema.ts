import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string().optional()
}).strict();
export const QuizQuestionWhereUniqueInputObjectSchema: z.ZodType<Prisma.QuizQuestionWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionWhereUniqueInput>;
export const QuizQuestionWhereUniqueInputObjectZodSchema = makeSchema();
