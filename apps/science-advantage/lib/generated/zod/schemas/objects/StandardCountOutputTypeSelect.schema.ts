import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  lessons: z.boolean().optional(),
  quizQuestions: z.boolean().optional(),
  masteryRecords: z.boolean().optional()
}).strict();
export const StandardCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.StandardCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.StandardCountOutputTypeSelect>;
export const StandardCountOutputTypeSelectObjectZodSchema = makeSchema();
