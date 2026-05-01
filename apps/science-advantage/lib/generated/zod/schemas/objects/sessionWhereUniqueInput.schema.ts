import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  token: z.string().optional()
}).strict();
export const sessionWhereUniqueInputObjectSchema: z.ZodType<Prisma.sessionWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.sessionWhereUniqueInput>;
export const sessionWhereUniqueInputObjectZodSchema = makeSchema();
