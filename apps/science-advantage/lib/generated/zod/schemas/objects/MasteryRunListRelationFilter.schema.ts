import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './MasteryRunWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => MasteryRunWhereInputObjectSchema).optional(),
  some: z.lazy(() => MasteryRunWhereInputObjectSchema).optional(),
  none: z.lazy(() => MasteryRunWhereInputObjectSchema).optional()
}).strict();
export const MasteryRunListRelationFilterObjectSchema: z.ZodType<Prisma.MasteryRunListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunListRelationFilter>;
export const MasteryRunListRelationFilterObjectZodSchema = makeSchema();
