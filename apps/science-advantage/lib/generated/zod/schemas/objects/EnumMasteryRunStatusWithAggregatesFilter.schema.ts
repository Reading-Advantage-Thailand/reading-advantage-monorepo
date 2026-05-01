import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { NestedEnumMasteryRunStatusWithAggregatesFilterObjectSchema as NestedEnumMasteryRunStatusWithAggregatesFilterObjectSchema } from './NestedEnumMasteryRunStatusWithAggregatesFilter.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumMasteryRunStatusFilterObjectSchema as NestedEnumMasteryRunStatusFilterObjectSchema } from './NestedEnumMasteryRunStatusFilter.schema'

const makeSchema = () => z.object({
  equals: MasteryRunStatusSchema.optional(),
  in: MasteryRunStatusSchema.array().optional(),
  notIn: MasteryRunStatusSchema.array().optional(),
  not: z.union([MasteryRunStatusSchema, z.lazy(() => NestedEnumMasteryRunStatusWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema).optional()
}).strict();
export const EnumMasteryRunStatusWithAggregatesFilterObjectSchema: z.ZodType<Prisma.EnumMasteryRunStatusWithAggregatesFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumMasteryRunStatusWithAggregatesFilter>;
export const EnumMasteryRunStatusWithAggregatesFilterObjectZodSchema = makeSchema();
