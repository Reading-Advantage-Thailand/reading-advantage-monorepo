import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  expiresAt: z.coerce.date(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable()
}).strict();
export const sessionCreateManyUserInputObjectSchema: z.ZodType<Prisma.sessionCreateManyUserInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionCreateManyUserInput>;
export const sessionCreateManyUserInputObjectZodSchema = makeSchema();
