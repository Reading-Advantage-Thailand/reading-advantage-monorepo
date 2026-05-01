import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitClassIdFrameworkOrderCompoundUniqueInputObjectSchema as CurriculumUnitClassIdFrameworkOrderCompoundUniqueInputObjectSchema } from './CurriculumUnitClassIdFrameworkOrderCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  classId_framework_order: z.lazy(() => CurriculumUnitClassIdFrameworkOrderCompoundUniqueInputObjectSchema).optional()
}).strict();
export const CurriculumUnitWhereUniqueInputObjectSchema: z.ZodType<Prisma.CurriculumUnitWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitWhereUniqueInput>;
export const CurriculumUnitWhereUniqueInputObjectZodSchema = makeSchema();
