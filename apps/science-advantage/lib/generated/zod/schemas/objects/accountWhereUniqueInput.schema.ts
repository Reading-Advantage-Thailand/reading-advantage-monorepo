import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional()
}).strict();
export const accountWhereUniqueInputObjectSchema: z.ZodType<Prisma.accountWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.accountWhereUniqueInput>;
export const accountWhereUniqueInputObjectZodSchema = makeSchema();
