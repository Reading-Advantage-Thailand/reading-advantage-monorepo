import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  account: z.boolean().optional(),
  session: z.boolean().optional(),
  taughtClasses: z.boolean().optional(),
  enrolledClass: z.boolean().optional(),
  attempts: z.boolean().optional(),
  lessonCompletions: z.boolean().optional(),
  masteryRecords: z.boolean().optional(),
  masteryRuns: z.boolean().optional(),
  achievements: z.boolean().optional(),
  assignedLessons: z.boolean().optional()
}).strict();
export const UserCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.UserCountOutputTypeSelect>;
export const UserCountOutputTypeSelectObjectZodSchema = makeSchema();
