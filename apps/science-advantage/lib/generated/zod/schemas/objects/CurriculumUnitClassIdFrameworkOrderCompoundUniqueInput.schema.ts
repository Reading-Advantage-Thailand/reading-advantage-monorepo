import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  classId: z.string(),
  framework: StandardsAlignmentSchema,
  order: z.number().int()
}).strict();
export const CurriculumUnitClassIdFrameworkOrderCompoundUniqueInputObjectSchema: z.ZodType<Prisma.CurriculumUnitClassIdFrameworkOrderCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitClassIdFrameworkOrderCompoundUniqueInput>;
export const CurriculumUnitClassIdFrameworkOrderCompoundUniqueInputObjectZodSchema = makeSchema();
