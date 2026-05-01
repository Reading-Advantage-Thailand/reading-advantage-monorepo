import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './verificationSelect.schema'

const makeSchema = () => z.object({
  select: z.lazy(() => verificationSelectObjectSchema).optional()
}).strict();
export const verificationArgsObjectSchema = makeSchema();
export const verificationArgsObjectZodSchema = makeSchema();
