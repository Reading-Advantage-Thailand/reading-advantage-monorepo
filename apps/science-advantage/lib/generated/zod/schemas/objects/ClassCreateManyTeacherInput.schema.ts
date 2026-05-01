import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(100).trim(),
  gradeLevel: z.number().int().int().min(3).max(6),
  standardsAlignment: StandardsAlignmentSchema,
  joinCode: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();
export const ClassCreateManyTeacherInputObjectSchema: z.ZodType<Prisma.ClassCreateManyTeacherInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateManyTeacherInput>;
export const ClassCreateManyTeacherInputObjectZodSchema = makeSchema();
