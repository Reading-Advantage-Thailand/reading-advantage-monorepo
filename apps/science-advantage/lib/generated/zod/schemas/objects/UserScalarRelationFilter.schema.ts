import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  is: z.lazy(() => userWhereInputObjectSchema).optional(),
  isNot: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const UserScalarRelationFilterObjectSchema: z.ZodType<Prisma.UserScalarRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.UserScalarRelationFilter>;
export const UserScalarRelationFilterObjectZodSchema = makeSchema();
