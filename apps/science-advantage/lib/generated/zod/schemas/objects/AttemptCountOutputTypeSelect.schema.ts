import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  questionResponses: z.boolean().optional()
}).strict();
export const AttemptCountOutputTypeSelectObjectSchema: z.ZodType<Prisma.AttemptCountOutputTypeSelect> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCountOutputTypeSelect>;
export const AttemptCountOutputTypeSelectObjectZodSchema = makeSchema();
