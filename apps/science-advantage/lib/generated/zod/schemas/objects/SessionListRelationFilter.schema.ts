import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './sessionWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => sessionWhereInputObjectSchema).optional(),
  some: z.lazy(() => sessionWhereInputObjectSchema).optional(),
  none: z.lazy(() => sessionWhereInputObjectSchema).optional()
}).strict();
export const SessionListRelationFilterObjectSchema: z.ZodType<Prisma.SessionListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.SessionListRelationFilter>;
export const SessionListRelationFilterObjectZodSchema = makeSchema();
