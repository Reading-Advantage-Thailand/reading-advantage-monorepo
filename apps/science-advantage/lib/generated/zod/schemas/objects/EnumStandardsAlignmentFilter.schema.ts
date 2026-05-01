import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema';
import { NestedEnumStandardsAlignmentFilterObjectSchema as NestedEnumStandardsAlignmentFilterObjectSchema } from './NestedEnumStandardsAlignmentFilter.schema'

const makeSchema = () => z.object({
  equals: StandardsAlignmentSchema.optional(),
  in: StandardsAlignmentSchema.array().optional(),
  notIn: StandardsAlignmentSchema.array().optional(),
  not: z.union([StandardsAlignmentSchema, z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema)]).optional()
}).strict();
export const EnumStandardsAlignmentFilterObjectSchema: z.ZodType<Prisma.EnumStandardsAlignmentFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumStandardsAlignmentFilter>;
export const EnumStandardsAlignmentFilterObjectZodSchema = makeSchema();
