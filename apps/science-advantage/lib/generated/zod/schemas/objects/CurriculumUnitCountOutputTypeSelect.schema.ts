import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  lessons: z.boolean().optional()
}).strict();
export const CurriculumUnitCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.CurriculumUnitCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCountOutputTypeSelect>;
export const CurriculumUnitCountOutputTypeSelectObjectZodSchema = makeSchema();
