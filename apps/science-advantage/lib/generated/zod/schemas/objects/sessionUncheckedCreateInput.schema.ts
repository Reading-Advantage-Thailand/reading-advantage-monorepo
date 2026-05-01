import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
  userId: z.string()
}).strict();
export const sessionUncheckedCreateInputObjectSchema: z.ZodType<Prisma.sessionUncheckedCreateInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionUncheckedCreateInput>;
export const sessionUncheckedCreateInputObjectZodSchema = makeSchema();
