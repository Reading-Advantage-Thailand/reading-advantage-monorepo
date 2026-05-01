import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCountOutputTypeSelectObjectSchema as CurriculumUnitCountOutputTypeSelectObjectSchema } from './CurriculumUnitCountOutputTypeSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => CurriculumUnitCountOutputTypeSelectObjectSchema).optional()
}).strict();
export const CurriculumUnitCountOutputTypeArgsObjectSchema = makeSchema();
export const CurriculumUnitCountOutputTypeArgsObjectZodSchema = makeSchema();
