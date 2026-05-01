import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptArgsObjectSchema as AttemptArgsObjectSchema } from './AttemptArgs.schema';
import { userArgsObjectSchema as userArgsObjectSchema } from './userArgs.schema'

const makeSchema = () => z.object({
  attempt: z.union([z.boolean(), z.lazy(() => AttemptArgsObjectSchema)]).optional(),
  student: z.union([z.boolean(), z.lazy(() => userArgsObjectSchema)]).optional()
}).strict();
export const MasteryRunIncludeObjectSchema: z.ZodType<Prisma.MasteryRunInclude> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunInclude>;
export const MasteryRunIncludeObjectZodSchema = makeSchema();
