import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereInputObjectSchema as userWhereInputObjectSchema } from './userWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => userWhereInputObjectSchema).optional(),
  some: z.lazy(() => userWhereInputObjectSchema).optional(),
  none: z.lazy(() => userWhereInputObjectSchema).optional()
}).strict();
export const UserListRelationFilterObjectSchema: z.ZodType<Prisma.UserListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.UserListRelationFilter>;
export const UserListRelationFilterObjectZodSchema = makeSchema();
