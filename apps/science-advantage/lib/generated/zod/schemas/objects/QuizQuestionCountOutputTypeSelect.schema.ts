import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  standards: z.boolean().optional(),
  responses: z.boolean().optional()
}).strict();
export const QuizQuestionCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.QuizQuestionCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.QuizQuestionCountOutputTypeSelect>;
export const QuizQuestionCountOutputTypeSelectObjectZodSchema = makeSchema();
