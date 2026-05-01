import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  standardId: z.string(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int().optional(),
  lastAssessedAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const StandardMasteryCreateManyStudentInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateManyStudentInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyStudentInput>;
export const StandardMasteryCreateManyStudentInputObjectZodSchema = makeSchema();
