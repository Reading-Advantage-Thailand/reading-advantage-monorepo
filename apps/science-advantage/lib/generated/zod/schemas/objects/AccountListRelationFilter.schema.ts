import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountWhereInputObjectSchema as accountWhereInputObjectSchema } from './accountWhereInput.schema'

const makeSchema = () => z.object({
  every: z.lazy(() => accountWhereInputObjectSchema).optional(),
  some: z.lazy(() => accountWhereInputObjectSchema).optional(),
  none: z.lazy(() => accountWhereInputObjectSchema).optional()
}).strict();
export const AccountListRelationFilterObjectSchema: z.ZodType<Prisma.AccountListRelationFilter> = makeSchema() as unknown as z.ZodType<Prisma.AccountListRelationFilter>;
export const AccountListRelationFilterObjectZodSchema = makeSchema();
