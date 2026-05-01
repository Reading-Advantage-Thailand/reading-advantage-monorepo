import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { NestedEnumStandardsAlignmentWithAggregatesFilterObjectSchema as NestedEnumStandardsAlignmentWithAggregatesFilterObjectSchema } from './NestedEnumStandardsAlignmentWithAggregatesFilter.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumStandardsAlignmentFilterObjectSchema as NestedEnumStandardsAlignmentFilterObjectSchema } from './NestedEnumStandardsAlignmentFilter.schema'

const makeSchema = () => z.object({
  equals: StandardsAlignmentSchema.optional(),
  in: StandardsAlignmentSchema.array().optional(),
  notIn: StandardsAlignmentSchema.array().optional(),
  not: z.union([StandardsAlignmentSchema, z.lazy(() => NestedEnumStandardsAlignmentWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema).optional()
}).strict();
export const EnumStandardsAlignmentWithAggregatesFilterObjectSchema: z.ZodType<Prisma.EnumStandardsAlignmentWithAggregatesFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumStandardsAlignmentWithAggregatesFilter>;
export const EnumStandardsAlignmentWithAggregatesFilterObjectZodSchema = makeSchema();
