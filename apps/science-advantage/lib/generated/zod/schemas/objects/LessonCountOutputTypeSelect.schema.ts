import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  standards: z.boolean().optional(),
  curriculumUnits: z.boolean().optional(),
  quizQuestions: z.boolean().optional(),
  attempts: z.boolean().optional(),
  lessonCompletions: z.boolean().optional(),
  assignments: z.boolean().optional()
}).strict();
export const LessonCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.LessonCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.LessonCountOutputTypeSelect>;
export const LessonCountOutputTypeSelectObjectZodSchema = makeSchema();
