import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  attemptId: z.string().optional()
}).strict();
export const MasteryRunWhereUniqueInputObjectSchema: z.ZodType<Prisma.MasteryRunWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.MasteryRunWhereUniqueInput>;
export const MasteryRunWhereUniqueInputObjectZodSchema = makeSchema();
