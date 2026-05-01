import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { SortOrderSchema } from '../enums/SortOrder.schema'

const makeSchema = () => z.object({
  _count: SortOrderSchema.optional()
}).strict();
export const CurriculumUnitOrderByRelationAggregateInputObjectSchema: z.ZodType<Prisma.CurriculumUnitOrderByRelationAggregateInput> = makeSchema() as unknown as z.ZodType<Prisma.CurriculumUnitOrderByRelationAggregateInput>;
export const CurriculumUnitOrderByRelationAggregateInputObjectZodSchema = makeSchema();
