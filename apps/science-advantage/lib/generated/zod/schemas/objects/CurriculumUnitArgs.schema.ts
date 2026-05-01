import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitSelectObjectSchema as CurriculumUnitSelectObjectSchema } from './CurriculumUnitSelect.schema';
import { CurriculumUnitIncludeObjectSchema as CurriculumUnitIncludeObjectSchema } from './CurriculumUnitInclude.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => CurriculumUnitSelectObjectSchema).optional(),
  include: z.lazy(() => CurriculumUnitIncludeObjectSchema).optional()
}).strict();
export const CurriculumUnitArgsObjectSchema = makeSchema();
export const CurriculumUnitArgsObjectZodSchema = makeSchema();
