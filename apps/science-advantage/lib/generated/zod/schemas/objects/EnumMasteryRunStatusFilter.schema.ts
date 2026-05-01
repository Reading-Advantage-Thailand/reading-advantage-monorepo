import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunStatusSchema } from '../enums/MasteryRunStatus.schema';
import { NestedEnumMasteryRunStatusFilterObjectSchema as NestedEnumMasteryRunStatusFilterObjectSchema } from './NestedEnumMasteryRunStatusFilter.schema'

const makeSchema = () => z.object({
  equals: MasteryRunStatusSchema.optional(),
  in: MasteryRunStatusSchema.array().optional(),
  notIn: MasteryRunStatusSchema.array().optional(),
  not: z.union([MasteryRunStatusSchema, z.lazy(() => NestedEnumMasteryRunStatusFilterObjectSchema)]).optional()
}).strict();
export const EnumMasteryRunStatusFilterObjectSchema: z.ZodType<Prisma.EnumMasteryRunStatusFilter> = makeSchema() as unknown as z.ZodType<Prisma.EnumMasteryRunStatusFilter>;
export const EnumMasteryRunStatusFilterObjectZodSchema = makeSchema();
