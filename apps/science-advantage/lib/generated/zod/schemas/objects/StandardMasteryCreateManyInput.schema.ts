import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId: z.string(),
  standardId: z.string(),
  masteryLevel: z.number(),
  evidenceCount: z.number().int().optional(),
  lastAssessedAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const StandardMasteryCreateManyInputObjectSchema: z.ZodType<Prisma.StandardMasteryCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryCreateManyInput>;
export const StandardMasteryCreateManyInputObjectZodSchema = makeSchema();
