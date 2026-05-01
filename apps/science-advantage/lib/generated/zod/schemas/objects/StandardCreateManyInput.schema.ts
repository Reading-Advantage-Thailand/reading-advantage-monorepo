import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework: StandardsAlignmentSchema,
  code: z.string(),
  description: z.string(),
  gradeLevel: z.number().int().optional().nullable()
}).strict();
export const StandardCreateManyInputObjectSchema: z.ZodType<Prisma.StandardCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardCreateManyInput>;
export const StandardCreateManyInputObjectZodSchema = makeSchema();
