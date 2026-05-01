import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  students: z.boolean().optional(),
  curriculumUnits: z.boolean().optional(),
  assignments: z.boolean().optional()
}).strict();
export const ClassCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.ClassCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.ClassCountOutputTypeSelect>;
export const ClassCountOutputTypeSelectObjectZodSchema = makeSchema();
