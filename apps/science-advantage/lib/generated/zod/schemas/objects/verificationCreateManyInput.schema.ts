import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional().nullable(),
  updatedAt: z.coerce.date().optional().nullable()
}).strict();
export const verificationCreateManyInputObjectSchema: z.ZodType<Prisma.verificationCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.verificationCreateManyInput>;
export const verificationCreateManyInputObjectZodSchema = makeSchema();
