import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateNestedOneWithoutAccountInputObjectSchema as userCreateNestedOneWithoutAccountInputObjectSchema } from './userCreateNestedOneWithoutAccountInput.schema'

const makeSchema = () => z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  idToken: z.string().optional().nullable(),
  accessTokenExpiresAt: z.coerce.date().optional().nullable(),
  refreshTokenExpiresAt: z.coerce.date().optional().nullable(),
  scope: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  user: z.lazy(() => userCreateNestedOneWithoutAccountInputObjectSchema)
}).strict();
export const accountCreateInputObjectSchema: z.ZodType<Prisma.accountCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.accountCreateInput>;
export const accountCreateInputObjectZodSchema = makeSchema();
