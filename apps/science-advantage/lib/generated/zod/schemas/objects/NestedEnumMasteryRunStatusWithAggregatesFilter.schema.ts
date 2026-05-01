import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { NestedIntFilterObjectSchema as NestedIntFilterObjectSchema } from './NestedIntFilter.schema';
import { NestedEnumMasteryRunStatusFilterObjectSchema as NestedEnumMasteryRunStatusFilterObjectSchema } from './NestedEnumMasteryRunStatusFilter.schema'

const nestedenummasteryrunstatuswithaggregatesfilterSchema = z.object({
  equals: MasteryRunStatusSchema.optional(),
  in: MasteryRunStatusSchema.array().optional(),
  notIn: MasteryRunStatusSchema.array().optional(),
  not: z.union([MasteryRunStatusSchema, z.lazy(() => NestedEnumMasteryRunStatusWithAggregatesFilterObjectSchema)]).optional(),
  _count: z.lazy(() => NestedIntFilterObjectSchema).optional(),
  _min: z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema).optional(),
  _max: z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema).optional()
}).strict();
export const NestedEnumMasteryRunStatusWithAggregatesFilterObjectSchema: z.ZodType<Prisma.NestedEnumMasteryRunStatusWithAggregatesFilter> = nestedenummasteryrunstatuswithaggregatesfilterSchema as unknown as z.ZodType<Prisma.NestedEnumMasteryRunStatusWithAggregatesFilter>;
export const NestedEnumMasteryRunStatusWithAggregatesFilterObjectZodSchema = nestedenummasteryrunstatuswithaggregatesfilterSchema;
