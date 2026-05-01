import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutSessionInputObjectSchema as userCreateNestedOneWithoutSessionInputObjectSchema } from './userCreateNestedOneWithoutSessionInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  user: z.lazy(() => userCreateNestedOneWithoutSessionInputObjectSchema)
}).strict();
export const sessionCreateInputObjectSchema: z.ZodType<Prisma.sessionCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionCreateInput>;
export const sessionCreateInputObjectZodSchema = makeSchema();
