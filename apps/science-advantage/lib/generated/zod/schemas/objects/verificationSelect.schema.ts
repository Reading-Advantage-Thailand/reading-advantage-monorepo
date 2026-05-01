import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.boolean().optional(),
  identifier: z.boolean().optional(),
  value: z.boolean().optional(),
  expiresAt: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional()
}).strict();
export const verificationSelectObjectSchema: z.ZodType<Prisma.verificationSelect> = makeSchema() as unknown as z.ZodType<Prisma.verificationSelect>;
export const verificationSelectObjectZodSchema = makeSchema();
