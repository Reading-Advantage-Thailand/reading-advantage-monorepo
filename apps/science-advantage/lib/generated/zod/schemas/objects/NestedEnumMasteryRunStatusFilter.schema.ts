import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema'

const nestedenummasteryrunstatusfilterSchema = z.object({
  equals: MasteryRunStatusSchema.optional(),
  in: MasteryRunStatusSchema.array().optional(),
  notIn: MasteryRunStatusSchema.array().optional(),
  not: z.union([MasteryRunStatusSchema, z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema)]).optional()
}).strict();
export const NestedEnumMasteryRunStatusFilterObjectSchema: z.ZodType<Prisma.NestedEnumMasteryRunStatusFilter> = nestedenummasteryrunstatusfilterSchema as unknown as z.ZodType<Prisma.NestedEnumMasteryRunStatusFilter>;
export const NestedEnumMasteryRunStatusFilterObjectZodSchema = nestedenummasteryrunstatusfilterSchema;
