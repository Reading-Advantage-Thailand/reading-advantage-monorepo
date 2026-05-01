import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => MasteryRunWhereInputObjectSchema).optional().nullable(),
  isNot: z.lazy(() => MasteryRunWhereInputObjectSchema).optional().nullable()
}).strict();
export const MasteryRunNullableScalarRelationFilterObjectSchema: z.ZodType<Prisma.MasteryRunNullableScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunNullableScalarRelationFilter>;
export const MasteryRunNullableScalarRelationFilterObjectZodSchema = makeSchema();
