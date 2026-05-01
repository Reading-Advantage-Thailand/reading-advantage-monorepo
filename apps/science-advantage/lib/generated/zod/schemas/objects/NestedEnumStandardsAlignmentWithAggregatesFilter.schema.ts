import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumStandardsAlignmentFilterObjectSchema as NestedEnumStandardsAlignmentFilterObjectSchema } from './NestedEnumStandardsAlignmentFilter.schema'

const nestedenumstandardsalignmentwithaggregatesfilterSchema = z.object({
  equals: StandardsAlignmentSchema.optional(),
  in: StandardsAlignmentSchema.array().optional(),
  notIn: StandardsAlignmentSchema.array().optional(),
  not: z.union([StandardsAlignmentSchema, z.lazy(() => NestedEnumStandardsAlignmentWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema).optional()
}).strict();
export const NestedEnumStandardsAlignmentWithAggregatesFilterObjectSchema: z.ZodType<Prisma.NestedEnumStandardsAlignmentWithAggregatesFilter> = nestedenumstandardsalignmentwithaggregatesfilterSchema as unknown as z.ZodType<Prisma.NestedEnumStandardsAlignmentWithAggregatesFilter>;
export const NestedEnumStandardsAlignmentWithAggregatesFilterObjectZodSchema = nestedenumstandardsalignmentwithaggregatesfilterSchema;
