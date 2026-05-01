import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema';
import { StandardArgsObjectSchema as StandardArgsObjectSchema } from './StandardArgs.schema'

const makeSchema = () => z.object({
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional(),
  standard: z.union([z.boolean(), z.lazy(() => StandardArgsObjectSchema)]).optional()
}).strict();
export const StandardMasteryIncludeObjectSchema: z.ZodType<Prisma.StandardMasteryInclude> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryInclude>;
export const StandardMasteryIncludeObjectZodSchema = makeSchema();
