import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { CurriculumUnitCreateManyClassInputObjectSchema as CurriculumUnitCreateManyClassInputObjectSchema } from './CurriculumUnitCreateManyClassInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => CurriculumUnitCreateManyClassInputObjectSchema), z.lazy(() => CurriculumUnitCreateManyClassInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const CurriculumUnitCreateManyClassInputEnvelopeObjectSchema: z.ZodType<Prisma.CurriculumUnitCreateManyClassInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitCreateManyClassInputEnvelope>;
export const CurriculumUnitCreateManyClassInputEnvelopeObjectZodSchema = makeSchema();
