import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './GamificationProfileWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => GamificationProfileWhereInputObjectSchema).optional().nullable(),
  isNot: z.lazy(() => GamificationProfileWhereInputObjectSchema).optional().nullable()
}).strict();
export const GamificationProfileNullableScalarRelationFilterObjectSchema: z.ZodType<Prisma.GamificationProfileNullableScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileNullableScalarRelationFilter>;
export const GamificationProfileNullableScalarRelationFilterObjectZodSchema = makeSchema();
