import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitWhereInputObjectSchema as CurriculumUnitWhereInputObjectSchema } from './CurriculumUnitWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => CurriculumUnitWhereInputObjectSchema).optional(),
  some: z.lazy(() => CurriculumUnitWhereInputObjectSchema).optional(),
  none: z.lazy(() => CurriculumUnitWhereInputObjectSchema).optional()
}).strict();
export const CurriculumUnitListRelationFilterObjectSchema: z.ZodType<Prisma.CurriculumUnitListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitListRelationFilter>;
export const CurriculumUnitListRelationFilterObjectZodSchema = makeSchema();
