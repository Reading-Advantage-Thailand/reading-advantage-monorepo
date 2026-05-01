import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const nestedenumstandardsalignmentfilterSchema = z.object({
  equals: StandardsAlignmentSchema.optional(),
  in: StandardsAlignmentSchema.array().optional(),
  notIn: StandardsAlignmentSchema.array().optional(),
  not: z.union([StandardsAlignmentSchema, z.lazy(() => NestedEnumStandardsAlignmentFilterObjectSchema)]).optional()
}).strict();
export const NestedEnumStandardsAlignmentFilterObjectSchema: z.ZodType<Prisma.NestedEnumStandardsAlignmentFilter> = nestedenumstandardsalignmentfilterSchema as unknown as z.ZodType<Prisma.NestedEnumStandardsAlignmentFilter>;
export const NestedEnumStandardsAlignmentFilterObjectZodSchema = nestedenumstandardsalignmentfilterSchema;
