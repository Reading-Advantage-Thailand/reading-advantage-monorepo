import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional()
}).strict();
export const QuestionResponseWhereUniqueInputObjectSchema: z.ZodType<Prisma.QuestionResponseWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.QuestionResponseWhereUniqueInput>;
export const QuestionResponseWhereUniqueInputObjectZodSchema = makeSchema();
